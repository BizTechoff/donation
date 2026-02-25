using System.Text.Json;

namespace ScannerWatcher;

public class AppSettings
{
    public string ServerUrl { get; set; } = "https://localhost:3002";
    public string WatchFolder { get; set; } = @"C:\scans";
    public string ArchiveFolder { get; set; } = @"C:\scans\archive";
    public string[] FileExtensions { get; set; } = [".pdf", ".jpg", ".jpeg", ".jfif", ".png", ".tiff", ".tif"];
    public int StabilizationSeconds { get; set; } = 2;

    // Persisted session cookie (not in settings.json, stored separately)
    public string? SessionCookie { get; set; }

    private static readonly string SettingsPath = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, "settings.json");

    private static readonly string CookiePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ScannerWatcher", "session.dat");

    public static AppSettings Load()
    {
        AppSettings settings;

        if (File.Exists(SettingsPath))
        {
            var json = File.ReadAllText(SettingsPath);
            settings = JsonSerializer.Deserialize<AppSettings>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new AppSettings();
        }
        else
        {
            settings = new AppSettings();
        }

        // Load cookie from separate file
        if (File.Exists(CookiePath))
        {
            settings.SessionCookie = File.ReadAllText(CookiePath).Trim();
        }

        return settings;
    }

    public void Save()
    {
        var json = JsonSerializer.Serialize(this, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        File.WriteAllText(SettingsPath, json);
    }

    public void SaveCookie()
    {
        var dir = Path.GetDirectoryName(CookiePath)!;
        if (!Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        File.WriteAllText(CookiePath, SessionCookie ?? "");
    }

    public void ClearCookie()
    {
        SessionCookie = null;
        if (File.Exists(CookiePath))
            File.Delete(CookiePath);
    }
}
