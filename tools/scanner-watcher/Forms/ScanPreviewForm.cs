using System.Drawing;
using System.Drawing.Drawing2D;

namespace ScannerWatcher.Forms;

/// <summary>
/// Shows a preview of the scan with a draggable tag overlay.
/// User can drag the tag to any position before confirming.
/// </summary>
public class ScanPreviewForm : Form
{
    private readonly string _filePath;
    private readonly string _donorName;
    private readonly PictureBox _pictureBox;
    private readonly Panel _imagePanel;
    private readonly Button _btnConfirm;
    private readonly Button _btnCancel;
    private readonly CheckBox _chkNoTag;
    private readonly Label _lblInstructions;

    private Image? _originalImage;
    private float _tagXPercent = 2f;  // Default: top-right (RTL)
    private float _tagYPercent = 2f;
    private bool _isDragging;
    private Point _dragOffset;
    private RectangleF _tagRect;
    private float _displayScale = 1f;

    public float TagXPercent => _chkNoTag.Checked ? -1 : _tagXPercent;
    public float TagYPercent => _chkNoTag.Checked ? -1 : _tagYPercent;
    public bool NoTag => _chkNoTag.Checked;

    public ScanPreviewForm(string filePath, string donorName)
    {
        _filePath = filePath;
        _donorName = donorName;

        Text = "תצוגה מקדימה - גרור את התגית למיקום הרצוי";
        Size = new Size(900, 700);
        MinimumSize = new Size(600, 500);
        StartPosition = FormStartPosition.CenterScreen;
        RightToLeft = RightToLeft.Yes;
        RightToLeftLayout = true;
        TopMost = true;

        // Instructions label
        _lblInstructions = new Label
        {
            Text = "גרור את התגית למיקום הרצוי על התמונה",
            Dock = DockStyle.Top,
            Height = 30,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font(Font.FontFamily, 10),
            BackColor = Color.FromArgb(240, 240, 240)
        };

        // Image panel with scroll
        _imagePanel = new Panel
        {
            Dock = DockStyle.Fill,
            AutoScroll = true,
            BackColor = Color.FromArgb(50, 50, 50)
        };

        // PictureBox for image display
        _pictureBox = new PictureBox
        {
            SizeMode = PictureBoxSizeMode.Zoom,
            Cursor = Cursors.Default,
            BackColor = Color.Transparent
        };

        _pictureBox.MouseDown += OnMouseDown;
        _pictureBox.MouseMove += OnMouseMove;
        _pictureBox.MouseUp += OnMouseUp;
        _pictureBox.Paint += OnPaint;

        _imagePanel.Controls.Add(_pictureBox);

        // Bottom panel with buttons
        var bottomPanel = new Panel
        {
            Dock = DockStyle.Bottom,
            Height = 60,
            Padding = new Padding(10),
            BackColor = Color.FromArgb(245, 245, 245)
        };

        _chkNoTag = new CheckBox
        {
            Text = "ללא תגית",
            Location = new Point(20, 18),
            AutoSize = true
        };
        _chkNoTag.CheckedChanged += (s, e) =>
        {
            _pictureBox.Invalidate();
            _pictureBox.Cursor = _chkNoTag.Checked ? Cursors.Default : Cursors.Hand;
        };

        _btnConfirm = new Button
        {
            Text = "אישור והעלאה",
            Size = new Size(130, 40),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(76, 175, 80),
            ForeColor = Color.White,
            Font = new Font(Font.FontFamily, 10, FontStyle.Bold)
        };
        _btnConfirm.Click += (s, e) =>
        {
            DialogResult = DialogResult.OK;
            Close();
        };

        _btnCancel = new Button
        {
            Text = "ביטול",
            Size = new Size(100, 40),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
            FlatStyle = FlatStyle.Flat
        };
        _btnCancel.Click += (s, e) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        bottomPanel.Controls.AddRange([_chkNoTag, _btnConfirm, _btnCancel]);

        Controls.AddRange([_imagePanel, bottomPanel, _lblInstructions]);

        Load += OnFormLoad;
        Resize += OnFormResize;

        AcceptButton = _btnConfirm;
        CancelButton = _btnCancel;
    }

    private void OnFormLoad(object? sender, EventArgs e)
    {
        try
        {
            _originalImage = Image.FromFile(_filePath);
            UpdateLayout();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"שגיאה בטעינת התמונה: {ex.Message}", "שגיאה",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            DialogResult = DialogResult.Cancel;
            Close();
        }
    }

    private void OnFormResize(object? sender, EventArgs e)
    {
        UpdateLayout();
    }

    private void UpdateLayout()
    {
        if (_originalImage == null) return;

        // Calculate display size to fit in panel while maintaining aspect ratio
        var panelWidth = _imagePanel.ClientSize.Width - 40;
        var panelHeight = _imagePanel.ClientSize.Height - 40;

        var scaleX = (float)panelWidth / _originalImage.Width;
        var scaleY = (float)panelHeight / _originalImage.Height;
        _displayScale = Math.Min(scaleX, scaleY);
        _displayScale = Math.Min(_displayScale, 1f); // Don't upscale

        var displayWidth = (int)(_originalImage.Width * _displayScale);
        var displayHeight = (int)(_originalImage.Height * _displayScale);

        _pictureBox.Size = new Size(displayWidth, displayHeight);
        _pictureBox.Location = new Point(
            Math.Max(20, (panelWidth - displayWidth) / 2 + 20),
            Math.Max(20, (panelHeight - displayHeight) / 2 + 20)
        );
        _pictureBox.Image = _originalImage;

        // Update tag rectangle
        UpdateTagRect();

        // Position buttons
        _btnConfirm.Location = new Point(ClientSize.Width - 160, 10);
        _btnCancel.Location = new Point(ClientSize.Width - 280, 10);
    }

    private void UpdateTagRect()
    {
        if (_originalImage == null) return;

        var tagSize = ImageTagger.MeasureTag(_donorName, _originalImage.Width, _originalImage.Height);
        var scaledTagWidth = tagSize.Width * _displayScale;
        var scaledTagHeight = tagSize.Height * _displayScale;

        var x = (_tagXPercent / 100f) * _pictureBox.Width;
        var y = (_tagYPercent / 100f) * _pictureBox.Height;

        // Clamp to bounds
        x = Math.Max(0, Math.Min(x, _pictureBox.Width - scaledTagWidth));
        y = Math.Max(0, Math.Min(y, _pictureBox.Height - scaledTagHeight));

        _tagRect = new RectangleF(x, y, scaledTagWidth, scaledTagHeight);
    }

    private void OnPaint(object? sender, PaintEventArgs e)
    {
        if (_originalImage == null || _chkNoTag.Checked) return;

        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.HighQuality;

        // Draw tag background
        using var bgBrush = new SolidBrush(Color.FromArgb(240, 255, 255, 255));
        g.FillRectangle(bgBrush, _tagRect);

        // Draw border (thicker when dragging)
        var borderWidth = _isDragging ? 2 : 1;
        var borderColor = _isDragging ? Color.FromArgb(33, 150, 243) : Color.FromArgb(60, 60, 60);
        using var borderPen = new Pen(borderColor, borderWidth);
        g.DrawRectangle(borderPen, _tagRect.X, _tagRect.Y, _tagRect.Width, _tagRect.Height);

        // Draw text
        var fontSize = 10f * _displayScale;
        fontSize = Math.Max(8f, fontSize);
        using var font = new Font("Segoe UI", fontSize, FontStyle.Bold);
        using var textBrush = new SolidBrush(Color.FromArgb(40, 40, 40));

        var textX = _tagRect.X + 6 * _displayScale;
        var textY = _tagRect.Y + 6 * _displayScale;
        g.DrawString(_donorName, font, textBrush, textX, textY);

        // Draw drag hint if not dragging
        if (!_isDragging)
        {
            using var hintPen = new Pen(Color.FromArgb(100, 33, 150, 243), 1);
            hintPen.DashStyle = DashStyle.Dot;
            g.DrawRectangle(hintPen, _tagRect.X - 2, _tagRect.Y - 2, _tagRect.Width + 4, _tagRect.Height + 4);
        }
    }

    private void OnMouseDown(object? sender, MouseEventArgs e)
    {
        if (_chkNoTag.Checked || _originalImage == null) return;

        if (_tagRect.Contains(e.Location))
        {
            _isDragging = true;
            _dragOffset = new Point(
                (int)(e.X - _tagRect.X),
                (int)(e.Y - _tagRect.Y)
            );
            _pictureBox.Cursor = Cursors.SizeAll;
            _pictureBox.Invalidate();
        }
    }

    private void OnMouseMove(object? sender, MouseEventArgs e)
    {
        if (_chkNoTag.Checked || _originalImage == null) return;

        if (_isDragging)
        {
            // Calculate new position
            var newX = e.X - _dragOffset.X;
            var newY = e.Y - _dragOffset.Y;

            // Clamp to picture box bounds
            newX = Math.Max(0, Math.Min(newX, _pictureBox.Width - (int)_tagRect.Width));
            newY = Math.Max(0, Math.Min(newY, _pictureBox.Height - (int)_tagRect.Height));

            // Convert to percentage
            _tagXPercent = (newX / (float)_pictureBox.Width) * 100f;
            _tagYPercent = (newY / (float)_pictureBox.Height) * 100f;

            UpdateTagRect();
            _pictureBox.Invalidate();
        }
        else
        {
            // Change cursor when hovering over tag
            _pictureBox.Cursor = _tagRect.Contains(e.Location) ? Cursors.Hand : Cursors.Default;
        }
    }

    private void OnMouseUp(object? sender, MouseEventArgs e)
    {
        if (_isDragging)
        {
            _isDragging = false;
            _pictureBox.Cursor = _tagRect.Contains(e.Location) ? Cursors.Hand : Cursors.Default;
            _pictureBox.Invalidate();
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _originalImage?.Dispose();
        }
        base.Dispose(disposing);
    }
}
