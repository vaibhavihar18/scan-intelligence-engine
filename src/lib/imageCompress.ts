/**
 * Compress and resize an image file for optimal upload.
 * Returns a base64 data URL string suitable for vision API.
 *
 * Strategy:
 * - Resize to max 800px on longest side (good for OCR, small payload)
 * - JPEG quality 0.7 for good compression
 * - Handle mobile photos with EXIF orientation via canvas
 */
export async function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Read EXIF orientation from raw JPEG data
        let orientation = 1;
        try {
          const buf = reader.result as ArrayBuffer;
          const view = new DataView(buf);
          if (view.getUint16(0, false) === 0xFFD8) {
            let offset = 2;
            while (offset < view.byteLength - 2) {
              const marker = view.getUint16(offset, false);
              offset += 2;
              if (marker === 0xFFE1) {
                const length = view.getUint16(offset, false);
                offset += 2 + 6; // Skip "Exif\0\0"
                if (offset + 2 <= view.byteLength) {
                  const bigEndian = view.getUint16(offset, false) === 0x4D4D;
                  const ifdOffset = view.getUint32(offset + 4, !bigEndian) + offset;
                  if (ifdOffset + 2 <= view.byteLength) {
                    const numEntries = view.getUint16(ifdOffset, !bigEndian);
                    for (let i = 0; i < numEntries; i++) {
                      const entryOffset = ifdOffset + 2 + i * 12;
                      if (entryOffset + 12 <= view.byteLength && view.getUint16(entryOffset, !bigEndian) === 0x0112) {
                        orientation = view.getUint16(entryOffset + 8, !bigEndian);
                        break;
                      }
                    }
                  }
                }
                break;
              } else if ((marker & 0xFF00) === 0xFF00) {
                offset += view.getUint16(offset, false);
              } else {
                break;
              }
            }
          }
        } catch { /* ignore EXIF errors */ }

        let { width, height } = img;

        // Swap dimensions for rotated orientations
        if (orientation >= 5) {
          const temp = width;
          width = height;
          height = temp;
        }

        // Resize maintaining aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create canvas context"));
          return;
        }

        ctx.save();
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
          case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
          case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
          case 7: ctx.transform(0, -1, -1, 0, height, width); break;
          case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
        }
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/** Validate that a file is an acceptable image type and within size limits. */
export function validateImage(file: File): string | null {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return "Please upload a JPG, PNG, or WEBP image.";
  }
  if (file.size > 20 * 1024 * 1024) {
    return "Image must be under 20MB.";
  }
  return null;
}
