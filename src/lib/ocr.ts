/**
 * Client-side OCR using tesseract.js with enhanced image preprocessing.
 * Runs entirely in the browser — no API key required.
 */
import { createWorker, type Worker } from "tesseract.js";

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker("eng", undefined, {
      logger: undefined,
    });
  }
  return worker;
}

/**
 * Preprocess a data URL image for better OCR:
 * - Increase contrast
 * - Sharpen edges
 * - Convert to grayscale
 */
function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }

      // Draw original
      ctx.drawImage(img, 0, 0);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale + increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Luminance
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Contrast stretch (simple: center at 128, multiply)
        const contrast = 1.5;
        const val = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/** Run OCR on a compressed data URL string. */
export async function runOcrOnDataUrl(dataUrl: string): Promise<string> {
  const w = await getWorker();

  // Try original first
  const { data: result1 } = await w.recognize(dataUrl);
  const text1 = result1.text ?? "";

  // If result is short, try with contrast enhancement
  if (text1.trim().length < 30) {
    try {
      const enhanced = await preprocessImage(dataUrl);
      const { data: result2 } = await w.recognize(enhanced);
      const text2 = result2.text ?? "";
      // Return whichever has more content
      return text2.length > text1.length ? text2 : text1;
    } catch {
      return text1;
    }
  }

  return text1;
}

export async function terminateOcr(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
