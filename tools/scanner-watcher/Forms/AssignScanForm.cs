namespace ScannerWatcher.Forms;

public class AssignScanForm : Form
{
    private readonly Button _btnYes;
    private readonly Button _btnNo;
    private readonly Button _btnSearch;

    public string? SelectedDonationId { get; private set; }

    /// <summary>
    /// Dialog asking "Assign scan to donation of [donor] - [amount]?"
    /// </summary>
    public AssignScanForm(string fileName, ActiveDonationInfo donation)
    {
        Text = "שיוך סריקה לתרומה";
        Size = new Size(450, 250);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        TopMost = true;

        var currencySymbol = GetCurrencySymbol(donation.CurrencyId);

        var lblFile = new Label
        {
            Text = $"קובץ חדש: {Path.GetFileName(fileName)}",
            Location = new Point(20, 20),
            Size = new Size(400, 25),
            Font = new Font(Font.FontFamily, 10)
        };

        var lblQuestion = new Label
        {
            Text = $"לשייך לתרומה של {donation.DonorName}?",
            Location = new Point(20, 55),
            Size = new Size(400, 30),
            Font = new Font(Font.FontFamily, 12, FontStyle.Bold)
        };

        var lblAmount = new Label
        {
            Text = $"סכום: {donation.Amount:N2} {currencySymbol}",
            Location = new Point(20, 90),
            Size = new Size(400, 25),
            Font = new Font(Font.FontFamily, 11)
        };

        _btnYes = new Button
        {
            Text = "כן, שייך",
            Location = new Point(20, 135),
            Size = new Size(125, 40),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(76, 175, 80),
            ForeColor = Color.White,
            Font = new Font(Font.FontFamily, 10, FontStyle.Bold)
        };
        _btnYes.Click += (s, e) =>
        {
            SelectedDonationId = donation.DonationId;
            DialogResult = DialogResult.OK;
            Close();
        };

        _btnSearch = new Button
        {
            Text = "חיפוש תרומה אחרת",
            Location = new Point(155, 135),
            Size = new Size(145, 40),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(33, 150, 243),
            ForeColor = Color.White
        };
        _btnSearch.Click += (s, e) =>
        {
            DialogResult = DialogResult.Retry; // Signal: open search
            Close();
        };

        _btnNo = new Button
        {
            Text = "ביטול",
            Location = new Point(310, 135),
            Size = new Size(100, 40),
            FlatStyle = FlatStyle.Flat
        };
        _btnNo.Click += (s, e) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        Controls.AddRange([lblFile, lblQuestion, lblAmount, _btnYes, _btnSearch, _btnNo]);

        AcceptButton = _btnYes;
        CancelButton = _btnNo;
    }

    private static string GetCurrencySymbol(string code) => code switch
    {
        "ILS" => "\u20AA",
        "USD" => "$",
        "EUR" => "\u20AC",
        "GBP" => "\u00A3",
        _ => code
    };
}
