namespace ScannerWatcher;

public class ScanWatcher : IDisposable
{
    private readonly FileSystemWatcher _watcher;
    private readonly AppSettings _settings;
    private readonly HashSet<string> _processingFiles = [];

    public event EventHandler<string>? FileDetected;

    public ScanWatcher(AppSettings settings)
    {
        _settings = settings;

        // Ensure watch folder exists
        if (!Directory.Exists(settings.WatchFolder))
            Directory.CreateDirectory(settings.WatchFolder);

        // Ensure archive folder exists
        if (!Directory.Exists(settings.ArchiveFolder))
            Directory.CreateDirectory(settings.ArchiveFolder);

        _watcher = new FileSystemWatcher(settings.WatchFolder)
        {
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite,
            IncludeSubdirectories = false,
            EnableRaisingEvents = false
        };

        // Add filters for each extension
        foreach (var ext in settings.FileExtensions)
        {
            _watcher.Filters.Add("*" + ext);
        }

        _watcher.Created += OnFileCreated;
        _watcher.Renamed += OnFileRenamed;
    }

    public void Start()
    {
        _watcher.EnableRaisingEvents = true;
        System.Diagnostics.Debug.WriteLine($"[ScanWatcher] Watching: {_settings.WatchFolder}");
    }

    public void Stop()
    {
        _watcher.EnableRaisingEvents = false;
    }

    private void OnFileCreated(object sender, FileSystemEventArgs e)
    {
        HandleNewFile(e.FullPath);
    }

    private void OnFileRenamed(object sender, RenamedEventArgs e)
    {
        // Check if the new name has a valid extension
        var ext = Path.GetExtension(e.FullPath).ToLowerInvariant();
        if (_settings.FileExtensions.Contains(ext))
        {
            HandleNewFile(e.FullPath);
        }
    }

    private void HandleNewFile(string filePath)
    {
        // Prevent duplicate processing
        lock (_processingFiles)
        {
            if (!_processingFiles.Add(filePath))
                return;
        }

        // Wait for file stabilization on a background thread
        Task.Run(async () =>
        {
            try
            {
                await WaitForFileStableAsync(filePath);
                FileDetected?.Invoke(this, filePath);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[ScanWatcher] Error processing {filePath}: {ex.Message}");
            }
            finally
            {
                lock (_processingFiles)
                {
                    _processingFiles.Remove(filePath);
                }
            }
        });
    }

    private async Task WaitForFileStableAsync(string filePath)
    {
        var stableTime = TimeSpan.FromSeconds(_settings.StabilizationSeconds);
        var maxWait = TimeSpan.FromSeconds(30);
        var startTime = DateTime.UtcNow;

        long lastSize = -1;
        DateTime lastChangeTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < maxWait)
        {
            await Task.Delay(500);

            if (!File.Exists(filePath))
                throw new FileNotFoundException("File disappeared", filePath);

            try
            {
                var info = new FileInfo(filePath);
                var currentSize = info.Length;

                if (currentSize != lastSize)
                {
                    lastSize = currentSize;
                    lastChangeTime = DateTime.UtcNow;
                }
                else if (DateTime.UtcNow - lastChangeTime >= stableTime)
                {
                    // File is stable - try to open it to verify it's not locked
                    using var stream = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                    return; // File is ready
                }
            }
            catch (IOException)
            {
                // File still being written, continue waiting
                lastChangeTime = DateTime.UtcNow;
            }
        }

        throw new TimeoutException($"File did not stabilize within {maxWait.TotalSeconds}s: {filePath}");
    }

    /// <summary>
    /// Move file to archive folder with timestamp prefix
    /// </summary>
    public string ArchiveFile(string filePath)
    {
        var fileName = Path.GetFileName(filePath);
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var archiveName = $"{timestamp}_{fileName}";
        var archivePath = Path.Combine(_settings.ArchiveFolder, archiveName);

        File.Move(filePath, archivePath, overwrite: true);
        return archivePath;
    }

    public void Dispose()
    {
        _watcher.Dispose();
    }
}
