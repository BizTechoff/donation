namespace ScannerWatcher.Forms;

public class SettingsForm : Form
{
    private readonly AppSettings _settings;
    private readonly TextBox _txtServerUrl;
    private readonly TextBox _txtWatchFolder;
    private readonly TextBox _txtArchiveFolder;

    public SettingsForm(AppSettings settings)
    {
        _settings = settings;

        Text = "הגדרות Scanner Watcher";
        Size = new Size(480, 300);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;

        var y = 20;
        var lblServer = new Label { Text = "כתובת שרת:", Location = new Point(20, y), AutoSize = true };
        y += 25;
        _txtServerUrl = new TextBox
        {
            Text = settings.ServerUrl,
            Location = new Point(20, y),
            Size = new Size(420, 25),
            RightToLeft = RightToLeft.No
        };

        y += 40;
        var lblWatch = new Label { Text = "תיקיית סריקות:", Location = new Point(20, y), AutoSize = true };
        y += 25;
        _txtWatchFolder = new TextBox
        {
            Text = settings.WatchFolder,
            Location = new Point(20, y),
            Size = new Size(350, 25),
            RightToLeft = RightToLeft.No
        };
        var btnBrowseWatch = new Button
        {
            Text = "...",
            Location = new Point(380, y),
            Size = new Size(60, 25)
        };
        btnBrowseWatch.Click += (s, e) => BrowseFolder(_txtWatchFolder);

        y += 40;
        var lblArchive = new Label { Text = "תיקיית ארכיון:", Location = new Point(20, y), AutoSize = true };
        y += 25;
        _txtArchiveFolder = new TextBox
        {
            Text = settings.ArchiveFolder,
            Location = new Point(20, y),
            Size = new Size(350, 25),
            RightToLeft = RightToLeft.No
        };
        var btnBrowseArchive = new Button
        {
            Text = "...",
            Location = new Point(380, y),
            Size = new Size(60, 25)
        };
        btnBrowseArchive.Click += (s, e) => BrowseFolder(_txtArchiveFolder);

        y += 45;
        var btnSave = new Button
        {
            Text = "שמור",
            Location = new Point(20, y),
            Size = new Size(100, 35),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(76, 175, 80),
            ForeColor = Color.White
        };
        btnSave.Click += BtnSave_Click;

        var btnCancel = new Button
        {
            Text = "ביטול",
            Location = new Point(130, y),
            Size = new Size(100, 35),
            FlatStyle = FlatStyle.Flat
        };
        btnCancel.Click += (s, e) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        Controls.AddRange([
            lblServer, _txtServerUrl,
            lblWatch, _txtWatchFolder, btnBrowseWatch,
            lblArchive, _txtArchiveFolder, btnBrowseArchive,
            btnSave, btnCancel
        ]);

        AcceptButton = btnSave;
        CancelButton = btnCancel;
    }

    private void BrowseFolder(TextBox target)
    {
        using var dialog = new FolderBrowserDialog
        {
            SelectedPath = target.Text,
            ShowNewFolderButton = true
        };

        if (dialog.ShowDialog() == DialogResult.OK)
        {
            target.Text = dialog.SelectedPath;
        }
    }

    private void BtnSave_Click(object? sender, EventArgs e)
    {
        var serverUrl = _txtServerUrl.Text.Trim();
        var watchFolder = _txtWatchFolder.Text.Trim();
        var archiveFolder = _txtArchiveFolder.Text.Trim();

        if (string.IsNullOrEmpty(serverUrl))
        {
            MessageBox.Show("נא להזין כתובת שרת", "שגיאה", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (string.IsNullOrEmpty(watchFolder))
        {
            MessageBox.Show("נא לבחור תיקיית סריקות", "שגיאה", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        _settings.ServerUrl = serverUrl;
        _settings.WatchFolder = watchFolder;
        _settings.ArchiveFolder = archiveFolder;

        try
        {
            _settings.Save();
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"שגיאה בשמירת הגדרות: {ex.Message}", "שגיאה",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
