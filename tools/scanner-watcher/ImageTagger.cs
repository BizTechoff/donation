using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

namespace ScannerWatcher;

/// <summary>
/// Burns a donor name tag onto scanned images at a specified position.
/// </summary>
public static class ImageTagger
{
    // Tag styling
    private const float FontSize = 10f; // Smaller font as requested
    private const int Padding = 6;
    private const int BorderWidth = 1;

    /// <summary>
    /// Burns a tag onto an image file at the specified position.
    /// Position is in percentages (0-100) from top-left corner.
    /// </summary>
    /// <param name="imagePath">Path to source image (JPG, PNG, TIFF)</param>
    /// <param name="donorName">Text to display on tag</param>
    /// <param name="xPercent">X position as percentage (0=left, 100=right)</param>
    /// <param name="yPercent">Y position as percentage (0=top, 100=bottom)</param>
    /// <returns>Path to the tagged image (same as input, overwritten)</returns>
    public static string BurnTag(string imagePath, string donorName, float xPercent, float yPercent)
    {
        if (string.IsNullOrWhiteSpace(donorName))
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
            DrawTag(g, donorName, original.Width, original.Height, xPercent, yPercent);
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
    public static Bitmap CreatePreview(Image original, string donorName, float xPercent, float yPercent)
    {
        var bitmap = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);

        using var g = Graphics.FromImage(bitmap);
        g.SmoothingMode = SmoothingMode.HighQuality;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

        g.DrawImage(original, 0, 0, original.Width, original.Height);

        if (!string.IsNullOrWhiteSpace(donorName))
        {
            DrawTag(g, donorName, original.Width, original.Height, xPercent, yPercent);
        }

        return bitmap;
    }

    /// <summary>
    /// Measures the tag size for a given donor name.
    /// Returns size in pixels for the given image dimensions.
    /// </summary>
    public static SizeF MeasureTag(string donorName, int imageWidth, int imageHeight)
    {
        using var measureBitmap = new Bitmap(1, 1);
        using var g = Graphics.FromImage(measureBitmap);

        var fontSize = CalculateFontSize(imageWidth, imageHeight);
        using var font = new Font("Segoe UI", fontSize, FontStyle.Bold);

        var textSize = g.MeasureString(donorName, font);
        return new SizeF(textSize.Width + Padding * 2, textSize.Height + Padding * 2);
    }

    private static void DrawTag(Graphics g, string donorName, int imageWidth, int imageHeight, float xPercent, float yPercent)
    {
        // Calculate font size based on image dimensions
        var fontSize = CalculateFontSize(imageWidth, imageHeight);
        using var font = new Font("Segoe UI", fontSize, FontStyle.Bold);

        // Measure text
        var textSize = g.MeasureString(donorName, font);
        var tagWidth = textSize.Width + Padding * 2;
        var tagHeight = textSize.Height + Padding * 2;

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

        // Draw text
        using var textBrush = new SolidBrush(Color.FromArgb(40, 40, 40));
        g.DrawString(donorName, font, textBrush, x + Padding, y + Padding);
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
