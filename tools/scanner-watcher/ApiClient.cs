using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ScannerWatcher;

public class ActiveDonationInfo
{
    public string DonationId { get; set; } = "";
    public string DonorName { get; set; } = "";
    public decimal Amount { get; set; }
    public string CurrencyId { get; set; } = "ILS";
}

public class DonationSearchResult
{
    public string DonationId { get; set; } = "";
    public string DonorName { get; set; } = "";
    public decimal Amount { get; set; }
    public string CurrencyId { get; set; } = "ILS";
    public DateTime? DonationDate { get; set; }
}

public class ApiClient : IDisposable
{
    private readonly HttpClient _http;
    private readonly AppSettings _settings;
    private readonly CookieContainer _cookies;

    public bool IsLoggedIn => !string.IsNullOrEmpty(_settings.SessionCookie);

    public ApiClient(AppSettings settings)
    {
        _settings = settings;
        _cookies = new CookieContainer();

        var handler = new HttpClientHandler
        {
            CookieContainer = _cookies,
            UseCookies = true
        };

        _http = new HttpClient(handler)
        {
            BaseAddress = new Uri(settings.ServerUrl.TrimEnd('/') + "/"),
            Timeout = TimeSpan.FromSeconds(30)
        };

        // Restore saved cookie
        if (!string.IsNullOrEmpty(settings.SessionCookie))
        {
            RestoreCookie(settings.SessionCookie);
        }
    }

    private void RestoreCookie(string cookieHeader)
    {
        try
        {
            var uri = _http.BaseAddress!;
            // Parse "name=value" pairs
            foreach (var part in cookieHeader.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = part.Trim();
                var eqIndex = trimmed.IndexOf('=');
                if (eqIndex > 0)
                {
                    var name = trimmed[..eqIndex];
                    var value = trimmed[(eqIndex + 1)..];
                    _cookies.Add(uri, new Cookie(name, value));
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to restore cookie: {ex.Message}");
        }
    }

    private void SaveCookies()
    {
        try
        {
            var uri = _http.BaseAddress!;
            var cookies = _cookies.GetCookies(uri);
            if (cookies.Count > 0)
            {
                var parts = cookies.Cast<Cookie>().Select(c => $"{c.Name}={c.Value}");
                _settings.SessionCookie = string.Join("; ", parts);
                _settings.SaveCookie();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to save cookies: {ex.Message}");
        }
    }

    /// <summary>
    /// Login with username + password. Returns user name on success.
    /// Remult Controller format: POST /api/{controller}/{method}
    /// Body: { "args": [], "fields": { "user": "...", "password": "..." } }
    /// </summary>
    public async Task<string> LoginAsync(string username, string password)
    {
        var payload = new
        {
            args = Array.Empty<object>(),
            fields = new { user = username, password }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        Logger.Info($"Login POST {_http.BaseAddress}api/signIn/signIn user: {username}");
        var response = await _http.PostAsync("api/signIn/signIn", content);

        var responseBody = await response.Content.ReadAsStringAsync();
        Logger.Info($"Login response: {response.StatusCode} body: {responseBody}");

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Login failed ({response.StatusCode}): {responseBody}");
        }

        // Remult always returns JSON. If not JSON - wrong server URL.
        if (string.IsNullOrWhiteSpace(responseBody) || !responseBody.TrimStart().StartsWith('{'))
        {
            throw new Exception($"תשובה לא תקינה מהשרת - בדוק את כתובת השרת בהגדרות");
        }

        // Save session cookies
        SaveCookies();

        try
        {
            using var doc = JsonDocument.Parse(responseBody);

            // Remult wraps result in { "data": { "result": { "id", "name", "roles" } } }
            if (doc.RootElement.TryGetProperty("data", out var dataProp))
            {
                if (dataProp.TryGetProperty("result", out var resultProp) &&
                    resultProp.TryGetProperty("name", out var nameProp2))
                    return nameProp2.GetString() ?? username;
            }

            // Or directly returns { "id", "name", "roles" }
            if (doc.RootElement.TryGetProperty("name", out var nameProp))
                return nameProp.GetString() ?? username;
        }
        catch (JsonException)
        {
            // Response is not JSON - that's OK, login succeeded (got 200)
        }

        return username;
    }

    /// <summary>
    /// Check if the current session is still valid
    /// </summary>
    public async Task<bool> CheckSessionAsync()
    {
        try
        {
            var response = await _http.GetAsync("api/scan/active-donation");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Get the active donation for the current user
    /// </summary>
    public async Task<ActiveDonationInfo?> GetActiveDonationAsync()
    {
        var response = await _http.GetAsync("api/scan/active-donation");
        var body = await response.Content.ReadAsStringAsync();
        Logger.Info($"GetActiveDonation: {response.StatusCode} body: {body}");

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == HttpStatusCode.Unauthorized)
                throw new UnauthorizedAccessException("Session expired");
            throw new Exception($"Failed to get active donation: {response.StatusCode}");
        }

        if (string.IsNullOrWhiteSpace(body) || body == "null")
            return null;

        // Guard against non-JSON responses
        if (!body.TrimStart().StartsWith('{'))
            return null;

        return JsonSerializer.Deserialize<ActiveDonationInfo>(body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    /// <summary>
    /// Upload a scanned file and assign it to a donation
    /// </summary>
    public async Task<bool> UploadScanAsync(string filePath, string donationId)
    {
        using var form = new MultipartFormDataContent();

        var fileBytes = await File.ReadAllBytesAsync(filePath);
        var fileContent = new ByteArrayContent(fileBytes);

        var mimeType = GetMimeType(filePath);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);

        form.Add(fileContent, "file", Path.GetFileName(filePath));
        form.Add(new StringContent(donationId), "donationId");

        var response = await _http.PostAsync("api/scan/upload", form);

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == HttpStatusCode.Unauthorized)
                throw new UnauthorizedAccessException("Session expired");

            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Upload failed ({response.StatusCode}): {errorBody}");
        }

        return true;
    }

    /// <summary>
    /// Search donations by query string
    /// </summary>
    public async Task<List<DonationSearchResult>> SearchDonationsAsync(string query)
    {
        var encodedQuery = Uri.EscapeDataString(query);
        var response = await _http.GetAsync($"api/scan/search-donations?q={encodedQuery}");

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == HttpStatusCode.Unauthorized)
                throw new UnauthorizedAccessException("Session expired");
            throw new Exception($"Search failed: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<DonationSearchResult>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? [];
    }

    public void Logout()
    {
        _settings.ClearCookie();
    }

    private static string GetMimeType(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".tiff" or ".tif" => "image/tiff",
            _ => "application/octet-stream"
        };
    }

    public void Dispose()
    {
        _http.Dispose();
    }
}
