using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

namespace ScannerWatcher;

/// <summary>
/// Burns a multi-line donor tag onto scanned images at a specified position.
/// כיום התגית מכילה 2 שורות (שם באנגלית + כתובת ראשית) אך המימוש מודולרי -
/// כל פונקציה פנימית עובדת עם string[] ומאפשרת הרחבה עתידית למספר שורות דינמי.
/// </summary>
public static class ImageTagger
{
    // Tag styling
    private const float FontSize = 10f; // Smaller font as requested
    private const int Padding = 6;
    private const int BorderWidth = 1;
    private const float LineSpacing = 2f; // Extra pixels between lines

    /// <summary>
    /// מסנן שורות ריקות - מרכיב את הטקסט בפועל שיוצג על התגית.
    /// בכך מטופל אוטומטית מצב שאין כתובת ראשית (line2 ריק) => תוצג רק שורה 1.
    /// </summary>
    private static string[] BuildLines(string line1, string line2)
    {
        return new[] { line1, line2 }
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Select(l => l.Trim())
            .ToArray();
    }

    /// <summary>
    /// Burns a tag onto an image file at the specified position.
    /// Position is in percentages (0-100) from top-left corner.
    /// </summary>
    /// <param name="imagePath">Path to source image (JPG, PNG, TIFF)</param>
    /// <param name="line1">שורה 1 בתגית (שם + תואר באנגלית)</param>
    /// <param name="line2">שורה 2 בתגית (כתובת ראשית) - יכולה להיות ריקה</param>
    /// <param name="xPercent">X position as percentage (0=left, 100=right)</param>
    /// <param name="yPercent">Y position as percentage (0=top, 100=bottom)</param>
    /// <returns>Path to the tagged image (same as input, overwritten)</returns>
    public static string BurnTag(string imagePath, string line1, string line2, float xPercent, float yPercent)
    {
        var lines = BuildLines(line1, line2);
        if (lines.Length == 0)
            return imagePath;

        var ext = Path.GetExtension(imagePath).ToLowerInvariant();

        // Handle PDF separately
        if (ext == ".pdf")
        {
            // PDF tagging not implemented - return as-is
            Logger.Info($"PDF tagging not supported, skipping: {imagePath}");
            return imagePath;
        }

        using var original = Image.FromFile(imagePath);
        using var bitmap = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);

        using (var g = Graphics.FromImage(bitmap))
        {
            // High quality rendering
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            // Draw original image
            g.DrawImage(original, 0, 0, original.Width, original.Height);

            // Draw tag
            DrawTag(g, lines, original.Width, original.Height, xPercent, yPercent);
        }

        // Dispose original before saving (releases file lock)
        original.Dispose();

        // Save with appropriate format
        var format = GetImageFormat(ext);

        // For JPEG, use high quality encoding
        if (format.Equals(ImageFormat.Jpeg))
        {
            var encoder = GetEncoder(ImageFormat.Jpeg);
            var encoderParams = new EncoderParameters(1);
            encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, 95L);
            bitmap.Save(imagePath, encoder, encoderParams);
        }
        else
        {
            bitmap.Save(imagePath, format);
        }

        Logger.Info($"Tag burned at ({xPercent:F1}%, {yPercent:F1}%): {Path.GetFileName(imagePath)}");
        return imagePath;
    }

    /// <summary>
    /// Creates a preview bitmap with the tag overlay (non-destructive).
    /// Used for the preview form.
    /// </summary>
    public static Bitmap CreatePreview(Image original, string line1, string line2, float xPercent, float yPercent)
    {
        var bitmap = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);

        using var g = Graphics.FromImage(bitmap);
        g.SmoothingMode = SmoothingMode.HighQuality;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

        g.DrawImage(original, 0, 0, original.Width, original.Height);

        var lines = BuildLines(line1, line2);
        if (lines.Length > 0)
        {
            DrawTag(g, lines, original.Width, original.Height, xPercent, yPercent);
        }

        return bitmap;
    }

    /// <summary>
    /// Measures the tag size for a given set of lines.
    /// Returns size in pixels for the given image dimensions.
    /// Width = max line width + padding. Height = sum of line heights + padding + spacings.
    /// </summary>
    public static SizeF MeasureTag(string line1, string line2, int imageWidth, int imageHeight)
    {
        var lines = BuildLines(line1, line2);
        if (lines.Length == 0)
            return SizeF.Empty;

        using var measureBitmap = new Bitmap(1, 1);
        using var g = Graphics.FromImage(measureBitmap);

        var fontSize = CalculateFontSize(imageWidth, imageHeight);
        using var font = new Font("Segoe UI", fontSize, FontStyle.Bold);

        float maxWidth = 0;
        float totalHeight = 0;
        for (int i = 0; i < lines.Length; i++)
        {
            var sz = g.MeasureString(lines[i], font);
            if (sz.Width > maxWidth) maxWidth = sz.Width;
            totalHeight += sz.Height;
            if (i < lines.Length - 1) totalHeight += LineSpacing;
        }

        return new SizeF(maxWidth + Padding * 2, totalHeight + Padding * 2);
    }

    private static void DrawTag(Graphics g, string[] lines, int imageWidth, int imageHeight, float xPercent, float yPercent)
    {
        if (lines.Length == 0) return;

        // Calculate font size based on image dimensions
        var fontSize = CalculateFontSize(imageWidth, imageHeight);
        using var font = new Font("Segoe UI", fontSize, FontStyle.Bold);

        // Measure each line
        var lineSizes = lines.Select(l => g.MeasureString(l, font)).ToArray();
        var maxLineWidth = lineSizes.Max(s => s.Width);
        var totalLinesHeight = lineSizes.Sum(s => s.Height) + LineSpacing * (lines.Length - 1);

        var tagWidth = maxLineWidth + Padding * 2;
        var tagHeight = totalLinesHeight + Padding * 2;

        // Calculate position (percentage to pixels)
        var x = (xPercent / 100f) * imageWidth;
        var y = (yPercent / 100f) * imageHeight;

        // Clamp to image bounds
        x = Math.Max(0, Math.Min(x, imageWidth - tagWidth));
        y = Math.Max(0, Math.Min(y, imageHeight - tagHeight));

        var tagRect = new RectangleF(x, y, tagWidth, tagHeight);

        // Draw semi-transparent white background
        using var bgBrush = new SolidBrush(Color.FromArgb(240, 255, 255, 255));
        g.FillRectangle(bgBrush, tagRect);

        // Draw border
        using var borderPen = new Pen(Color.FromArgb(60, 60, 60), BorderWidth);
        g.DrawRectangle(borderPen, x, y, tagWidth, tagHeight);

        // Draw each line
        using var textBrush = new SolidBrush(Color.FromArgb(40, 40, 40));
        float textY = y + Padding;
        for (int i = 0; i < lines.Length; i++)
        {
            g.DrawString(lines[i], font, textBrush, x + Padding, textY);
            textY += lineSizes[i].Height + LineSpacing;
        }
    }

    /// <summary>
    /// Calculates appropriate font size based on image dimensions.
    /// Smaller images get smaller fonts to maintain readability without overwhelming.
    /// </summary>
    private static float CalculateFontSize(int width, int height)
    {
        var minDimension = Math.Min(width, height);

        // Base: 10pt for ~1000px images, scale proportionally
        var scaleFactor = minDimension / 1000f;
        var calculatedSize = FontSize * scaleFactor;

        // Clamp between 8pt and 14pt
        return Math.Max(8f, Math.Min(14f, calculatedSize));
    }

    private static ImageFormat GetImageFormat(string extension) => extension switch
    {
        ".jpg" or ".jpeg" or ".jfif" => ImageFormat.Jpeg,
        ".png" => ImageFormat.Png,
        ".tiff" or ".tif" => ImageFormat.Tiff,
        _ => ImageFormat.Jpeg
    };

    private static ImageCodecInfo GetEncoder(ImageFormat format)
    {
        var codecs = ImageCodecInfo.GetImageDecoders();
        foreach (var codec in codecs)
        {
            if (codec.FormatID == format.Guid)
                return codec;
        }
        return codecs[0];
    }
}
