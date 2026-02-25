namespace ScannerWatcher.Forms;

public class LoginForm : Form
{
    private readonly TextBox _txtUsername;
    private readonly TextBox _txtPassword;
    private readonly Button _btnLogin;
    private readonly Label _lblStatus;
    private readonly ApiClient _api;

    public bool LoginSucceeded { get; private set; }

    public LoginForm(ApiClient api)
    {
        _api = api;

        Text = "Scanner Watcher - התחברות";
        Size = new Size(380, 260);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;

        var lblUser = new Label
        {
            Text = "שם משתמש:",
            Location = new Point(20, 25),
            AutoSize = true
        };

        _txtUsername = new TextBox
        {
            Location = new Point(20, 50),
            Size = new Size(320, 25),
            RightToLeft = RightToLeft.Yes
        };

        var lblPass = new Label
        {
            Text = "סיסמה:",
            Location = new Point(20, 85),
            AutoSize = true
        };

        _txtPassword = new TextBox
        {
            Location = new Point(20, 110),
            Size = new Size(320, 25),
            UseSystemPasswordChar = true,
            RightToLeft = RightToLeft.Yes
        };

        _btnLogin = new Button
        {
            Text = "התחבר",
            Location = new Point(20, 150),
            Size = new Size(320, 35),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(33, 150, 243),
            ForeColor = Color.White
        };
        _btnLogin.Click += BtnLogin_Click;

        _lblStatus = new Label
        {
            Text = "",
            Location = new Point(20, 195),
            Size = new Size(320, 20),
            ForeColor = Color.Red
        };

        Controls.AddRange([lblUser, _txtUsername, lblPass, _txtPassword, _btnLogin, _lblStatus]);

        AcceptButton = _btnLogin;
        _txtUsername.Focus();
    }

    private async void BtnLogin_Click(object? sender, EventArgs e)
    {
        var username = _txtUsername.Text.Trim();
        var password = _txtPassword.Text;

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
        {
            _lblStatus.Text = "נא להזין שם משתמש וסיסמה";
            return;
        }

        _btnLogin.Enabled = false;
        _lblStatus.ForeColor = Color.Gray;
        _lblStatus.Text = "מתחבר...";

        try
        {
            var name = await _api.LoginAsync(username, password);
            LoginSucceeded = true;
            _lblStatus.ForeColor = Color.Green;
            _lblStatus.Text = $"התחברת בהצלחה: {name}";
            await Task.Delay(500);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            _lblStatus.ForeColor = Color.Red;
            _lblStatus.Text = $"שגיאה: {ex.Message}";
            _btnLogin.Enabled = true;
        }
    }
}
