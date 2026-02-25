namespace ScannerWatcher.Forms;

public class DonationSearchForm : Form
{
    private readonly ApiClient _api;
    private readonly TextBox _txtSearch;
    private readonly Button _btnSearch;
    private readonly ListView _listView;
    private readonly Label _lblStatus;
    private readonly string _fileName;

    public string? SelectedDonationId { get; private set; }

    public DonationSearchForm(ApiClient api, string fileName)
    {
        _api = api;
        _fileName = fileName;

        Text = "חיפוש תרומה לשיוך סריקה";
        Size = new Size(600, 500);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        TopMost = true;

        var lblFile = new Label
        {
            Text = $"קובץ: {Path.GetFileName(fileName)}",
            Location = new Point(15, 10),
            Size = new Size(555, 20),
            Font = new Font(Font.FontFamily, 9)
        };

        var lblSearch = new Label
        {
            Text = "חיפוש (שם תורם / סכום):",
            Location = new Point(15, 35),
            AutoSize = true
        };

        _txtSearch = new TextBox
        {
            Location = new Point(15, 58),
            Size = new Size(455, 25),
            RightToLeft = RightToLeft.Yes
        };

        _btnSearch = new Button
        {
            Text = "חפש",
            Location = new Point(480, 56),
            Size = new Size(85, 28),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(33, 150, 243),
            ForeColor = Color.White
        };
        _btnSearch.Click += BtnSearch_Click;

        _listView = new ListView
        {
            Location = new Point(15, 95),
            Size = new Size(555, 310),
            View = View.Details,
            FullRowSelect = true,
            GridLines = true,
            MultiSelect = false,
            RightToLeftLayout = true
        };

        _listView.Columns.Add("שם תורם", 200);
        _listView.Columns.Add("סכום", 100);
        _listView.Columns.Add("מטבע", 60);
        _listView.Columns.Add("תאריך", 120);

        _listView.DoubleClick += ListView_DoubleClick;

        _lblStatus = new Label
        {
            Text = "הזן חיפוש ולחץ 'חפש'",
            Location = new Point(15, 415),
            Size = new Size(350, 20),
            ForeColor = Color.Gray
        };

        var btnSelect = new Button
        {
            Text = "בחר",
            Location = new Point(380, 410),
            Size = new Size(90, 35),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(76, 175, 80),
            ForeColor = Color.White
        };
        btnSelect.Click += BtnSelect_Click;

        var btnCancel = new Button
        {
            Text = "ביטול",
            Location = new Point(480, 410),
            Size = new Size(90, 35),
            FlatStyle = FlatStyle.Flat
        };
        btnCancel.Click += (s, e) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        Controls.AddRange([lblFile, lblSearch, _txtSearch, _btnSearch, _listView, _lblStatus, btnSelect, btnCancel]);

        AcceptButton = _btnSearch;
        CancelButton = btnCancel;
        _txtSearch.Focus();
    }

    private async void BtnSearch_Click(object? sender, EventArgs e)
    {
        var query = _txtSearch.Text.Trim();
        if (string.IsNullOrEmpty(query))
        {
            _lblStatus.Text = "נא להזין טקסט לחיפוש";
            return;
        }

        _btnSearch.Enabled = false;
        _lblStatus.ForeColor = Color.Gray;
        _lblStatus.Text = "מחפש...";
        _listView.Items.Clear();

        try
        {
            var results = await _api.SearchDonationsAsync(query);

            if (results.Count == 0)
            {
                _lblStatus.Text = "לא נמצאו תוצאות";
                _btnSearch.Enabled = true;
                return;
            }

            foreach (var r in results)
            {
                var item = new ListViewItem(r.DonorName);
                item.SubItems.Add(r.Amount.ToString("N2"));
                item.SubItems.Add(r.CurrencyId);
                item.SubItems.Add(r.DonationDate?.ToString("dd/MM/yyyy") ?? "");
                item.Tag = r.DonationId;
                _listView.Items.Add(item);
            }

            _lblStatus.Text = $"נמצאו {results.Count} תוצאות";
        }
        catch (UnauthorizedAccessException)
        {
            _lblStatus.ForeColor = Color.Red;
            _lblStatus.Text = "השיחה פגה - נא להתחבר מחדש";
        }
        catch (Exception ex)
        {
            _lblStatus.ForeColor = Color.Red;
            _lblStatus.Text = $"שגיאה: {ex.Message}";
        }
        finally
        {
            _btnSearch.Enabled = true;
        }
    }

    private void BtnSelect_Click(object? sender, EventArgs e)
    {
        SelectCurrentItem();
    }

    private void ListView_DoubleClick(object? sender, EventArgs e)
    {
        SelectCurrentItem();
    }

    private void SelectCurrentItem()
    {
        if (_listView.SelectedItems.Count == 0)
        {
            _lblStatus.ForeColor = Color.Red;
            _lblStatus.Text = "נא לבחור תרומה מהרשימה";
            return;
        }

        SelectedDonationId = _listView.SelectedItems[0].Tag as string;
        DialogResult = DialogResult.OK;
        Close();
    }
}
