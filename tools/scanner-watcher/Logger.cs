namespace ScannerWatcher;

public static class Logger
{
    private static readonly string LogFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ScannerWatcher", "logs");

    private static readonly object _lock = new();

    private static string GetLogFilePath()
    {
        if (!Directory.Exists(LogFolder))
            Directory.CreateDirectory(LogFolder);
        return Path.Combine(LogFolder, $"{DateTime.Now:yyyy-MM-dd}.log");
    }

    public static void Info(string message) => Write("INFO", message);
    public static void Error(string message) => Write("ERROR", message);
    public static void Error(string message, Exception ex) => Write("ERROR", $"{message}: {ex.Message}");

    private static void Write(string level, string message)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] [{level}] {message}";
        lock (_lock)
        {
            try
            {
                File.AppendAllText(GetLogFilePath(), line + Environment.NewLine);
            }
            catch { }
        }
    }

    /// <summary>
    /// Delete log files older than 7 days
    /// </summary>
    public static void CleanOldLogs()
    {
        try
        {
            if (!Directory.Exists(LogFolder)) return;
            foreach (var file in Directory.GetFiles(LogFolder, "*.log"))
            {
                if (File.GetCreationTime(file) < DateTime.Now.AddDays(-7))
                    File.Delete(file);
            }
        }
        catch { }
    }
}
