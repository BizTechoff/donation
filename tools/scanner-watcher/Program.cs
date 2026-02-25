using ScannerWatcher;
using ScannerWatcher.Forms;

namespace ScannerWatcher;

/// <summary>
/// Hidden form used solely for UI-thread marshalling (Invoke/BeginInvoke).
/// NotifyIcon is not a Control and doesn't support Invoke.
/// </summary>
sealed class InvokeHelper : Form
{
    public InvokeHelper()
    {
        ShowInTaskbar = false;
        FormBorderStyle = FormBorderStyle.None;
        Size = Size.Empty;
        Load += (s, e) => { Visible = false; };
    }
}

static class Program
{
    private static NotifyIcon _trayIcon = null!;
    private static InvokeHelper _invoker = null!;
    private static AppSettings _settings = null!;
    private static ApiClient _api = null!;
    private static ScanWatcher _watcher = null!;
    private static bool _isWatching;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.SystemAware);

        // Kill previous instance if running
        var currentProcess = System.Diagnostics.Process.GetCurrentProcess();
        foreach (var proc in System.Diagnostics.Process.GetProcessesByName(currentProcess.ProcessName))
        {
            if (proc.Id != currentProcess.Id)
            {
                try { proc.Kill(); proc.WaitForExit(3000); } catch { }
            }
        }

        Logger.CleanOldLogs();
        Logger.Info("=== Scanner Watcher started ===");

        // Load settings
        _settings = AppSettings.Load();
        Logger.Info($"Settings loaded. Server: {_settings.ServerUrl}, Watch: {_settings.WatchFolder}");

        // Create API client
        _api = new ApiClient(_settings);

        // Hidden form for UI-thread invoke
        _invoker = new InvokeHelper();

        // Build tray icon with platform logo
        _trayIcon = new NotifyIcon
        {
            Text = "Scanner Watcher",
            Icon = LoadAppIcon(),
            Visible = true,
            ContextMenuStrip = BuildContextMenu()
        };

        _trayIcon.DoubleClick += (s, e) => ShowStatus();

        // Initialize after message loop starts (non-blocking)
        _invoker.Load += async (s, e) =>
        {
            if (!await TryInitialLoginAsync())
            {
                Logger.Info("Login cancelled, exiting");
                Exit();
            }
        };

        Application.Run(_invoker);

        // Cleanup
        Logger.Info("=== Scanner Watcher exiting ===");
        _watcher?.Dispose();
        _api.Dispose();
        _trayIcon.Dispose();
    }

    /// <summary>
    /// Checks saved session or shows login. Returns false if user cancelled.
    /// </summary>
    private static async Task<bool> TryInitialLoginAsync()
    {
        if (_api.IsLoggedIn)
        {
            Logger.Info("Saved session found, validating...");
            var valid = await _api.CheckSessionAsync();
            if (valid)
            {
                Logger.Info("Session valid");
                StartWatching();
                _trayIcon.ShowBalloonTip(5000, "Scanner Watcher",
                    $"מחובר ומאזין לסריקות\nתיקייה: {_settings.WatchFolder}", ToolTipIcon.Info);
                return true;
            }
            Logger.Info("Session expired");
        }

        // Need to login
        ShowLoginForm();
        return _isWatching;
    }

    private static ContextMenuStrip BuildContextMenu()
    {
        var menu = new ContextMenuStrip();
        menu.RightToLeft = RightToLeft.Yes;

        menu.Items.Add("מצב", null, (s, e) => ShowStatus());
        menu.Items.Add("שייך קובץ...", null, (s, e) => ManualAssignFile());
        menu.Items.Add("התחברות", null, (s, e) => ShowLoginForm());
        menu.Items.Add("התנתקות", null, (s, e) => Logout());
        menu.Items.Add("הגדרות", null, (s, e) => ShowSettings());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("יציאה", null, (s, e) => Exit());

        // Show/hide login/logout based on state
        menu.Opening += (s, e) =>
        {
            menu.Items[1].Visible = _isWatching;   // שייך קובץ
            menu.Items[2].Visible = !_isWatching;   // התחברות
            menu.Items[3].Visible = _isWatching;    // התנתקות
        };

        return menu;
    }

    private static void ShowStatus()
    {
        var status = _isWatching
            ? $"מחובר ומאזין\nתיקייה: {_settings.WatchFolder}"
            : "לא מחובר";

        MessageBox.Show(status, "Scanner Watcher - מצב",
            MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private static void ShowLoginForm()
    {
        using var form = new LoginForm(_api);
        if (form.ShowDialog() == DialogResult.OK)
        {
            Logger.Info("Login succeeded");
            StartWatching();
            _trayIcon.ShowBalloonTip(2000, "Scanner Watcher",
                "התחברת בהצלחה! מאזין לסריקות...", ToolTipIcon.Info);
        }
    }

    private static void ShowSettings()
    {
        var wasWatching = _isWatching;

        // Stop watching while editing settings
        if (wasWatching)
            StopWatching();

        using var form = new SettingsForm(_settings);
        if (form.ShowDialog() == DialogResult.OK)
        {
            // Recreate API client with new URL
            _api.Dispose();
            _api = new ApiClient(_settings);
            Logger.Info($"Settings saved. Server: {_settings.ServerUrl}, Watch: {_settings.WatchFolder}");

            _trayIcon.ShowBalloonTip(2000, "Scanner Watcher",
                "ההגדרות נשמרו בהצלחה", ToolTipIcon.Info);
        }

        // Restart watching if was active and still logged in
        if (wasWatching && _api.IsLoggedIn)
            StartWatching();
    }

    private static void Logout()
    {
        StopWatching();
        _api.Logout();
        Logger.Info("User logged out");
        _trayIcon.ShowBalloonTip(1500, "Scanner Watcher",
            "התנתקת בהצלחה", ToolTipIcon.Info);
    }

    private static void StartWatching()
    {
        if (_isWatching) return;

        _watcher?.Dispose();
        _watcher = new ScanWatcher(_settings);
        _watcher.FileDetected += OnFileDetected;
        _watcher.Start();
        _isWatching = true;

        Logger.Info($"Watching started: {_settings.WatchFolder}");
        _trayIcon.Text = $"Scanner Watcher - מאזין ({_settings.WatchFolder})";
    }

    private static void StopWatching()
    {
        if (!_isWatching) return;

        _watcher?.Stop();
        _watcher?.Dispose();
        _isWatching = false;
        Logger.Info("Watching stopped");
        _trayIcon.Text = "Scanner Watcher - לא פעיל";
    }

    private static Icon LoadAppIcon()
    {
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;

        // Try PNG first (platform logo)
        var pngPath = Path.Combine(baseDir, "app.png");
        if (File.Exists(pngPath))
        {
            try
            {
                using var bmp = new Bitmap(pngPath);
                using var resized = new Bitmap(bmp, new Size(32, 32));
                return Icon.FromHandle(resized.GetHicon());
            }
            catch { }
        }

        // Fallback to ICO
        var icoPath = Path.Combine(baseDir, "app.ico");
        if (File.Exists(icoPath))
            return new Icon(icoPath);

        return SystemIcons.Application;
    }

    /// <summary>
    /// Run an action on the UI thread via the hidden helper form.
    /// </summary>
    private static void RunOnUI(Action action)
    {
        if (_invoker.InvokeRequired)
            _invoker.Invoke(action);
        else
            action();
    }

    private static async void OnFileDetected(object? sender, string filePath)
    {
        Logger.Info($"File detected: {filePath}");
        try
        {
            // Get active donation
            ActiveDonationInfo? activeDonation = null;
            try
            {
                activeDonation = await _api.GetActiveDonationAsync();
                Logger.Info(activeDonation != null
                    ? $"Active donation: {activeDonation.DonorName} - {activeDonation.Amount}"
                    : "No active donation");
            }
            catch (UnauthorizedAccessException)
            {
                Logger.Error("Session expired while getting active donation");
                RunOnUI(ShowLoginForm);
                return;
            }

            string? selectedDonationId = null;

            if (activeDonation != null)
            {
                // Show assign dialog on UI thread
                var result = DialogResult.None;
                RunOnUI(() =>
                {
                    using var form = new AssignScanForm(filePath, activeDonation);
                    result = form.ShowDialog();
                    if (result == DialogResult.OK)
                        selectedDonationId = form.SelectedDonationId;
                });

                if (result == DialogResult.Retry)
                {
                    // User chose to search for a different donation
                    RunOnUI(() =>
                    {
                        using var searchForm = new DonationSearchForm(_api, filePath);
                        if (searchForm.ShowDialog() == DialogResult.OK)
                            selectedDonationId = searchForm.SelectedDonationId;
                    });
                }
            }
            else
            {
                // No active donation - open search directly
                RunOnUI(() =>
                {
                    using var searchForm = new DonationSearchForm(_api, filePath);
                    if (searchForm.ShowDialog() == DialogResult.OK)
                        selectedDonationId = searchForm.SelectedDonationId;
                });
            }

            if (string.IsNullOrEmpty(selectedDonationId))
            {
                Logger.Info("Scan not assigned (cancelled)");
                _trayIcon.ShowBalloonTip(2000, "Scanner Watcher",
                    "הסריקה לא שויכה", ToolTipIcon.Warning);
                return;
            }

            // Upload file
            Logger.Info($"Uploading {Path.GetFileName(filePath)} to donation {selectedDonationId}");
            await _api.UploadScanAsync(filePath, selectedDonationId);

            // Archive file
            var archivePath = _watcher.ArchiveFile(filePath);
            Logger.Info($"Upload complete. Archived to: {archivePath}");

            _trayIcon.ShowBalloonTip(3000, "Scanner Watcher",
                $"הסריקה שויכה בהצלחה \u2705\n{Path.GetFileName(filePath)}", ToolTipIcon.Info);
        }
        catch (UnauthorizedAccessException)
        {
            Logger.Error("Session expired during upload");
            _trayIcon.ShowBalloonTip(3000, "Scanner Watcher",
                "השיחה פגה - נא להתחבר מחדש", ToolTipIcon.Error);
            RunOnUI(ShowLoginForm);
        }
        catch (Exception ex)
        {
            Logger.Error("File processing failed", ex);
            _trayIcon.ShowBalloonTip(3000, "Scanner Watcher",
                $"שגיאה: {ex.Message}", ToolTipIcon.Error);
        }
    }

    private static void ManualAssignFile()
    {
        using var dlg = new OpenFileDialog
        {
            Title = "בחר קובץ סריקה לשיוך",
            InitialDirectory = _settings.WatchFolder,
            Filter = "קבצי סריקה|*.pdf;*.jpg;*.jpeg;*.png;*.tiff;*.tif|כל הקבצים|*.*"
        };

        if (dlg.ShowDialog() == DialogResult.OK)
        {
            Logger.Info($"Manual assign: {dlg.FileName}");
            OnFileDetected(null, dlg.FileName);
        }
    }

    private static void Exit()
    {
        StopWatching();
        _trayIcon.Visible = false;
        Application.Exit();
    }
}
