/**
 * Client-side OCR using tesseract.js with enhanced image preprocessing.
 * Runs entirely in the browser — no API key required.
 *
 * Multiple preprocessing strategies are tried to maximize OCR quality
 * on real food package photographs taken with phones.
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
 * Preprocess image for OCR with multiple strategies.
 * Returns the best result from multiple passes.
 */
function preprocessImage(
  dataUrl: string,
  strategy: "contrast" | "binarize" | "highcontrast"
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Use larger canvas for better OCR on small text
      const maxDim = 2000;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      if (strategy === "contrast") {
        // Enhanced grayscale + contrast stretch
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Adaptive contrast with higher multiplier
          const contrast = 1.8;
          const val = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      } else if (strategy === "binarize") {
        // Grayscale + Otsu-like binarization for clear text
        const grayValues: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          grayValues.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        // Calculate Otsu threshold
        const histogram = new Array(256).fill(0);
        for (const v of grayValues) histogram[Math.round(v)]++;
        const total = grayValues.length;
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * histogram[i];
        let sumB = 0;
        let wB = 0;
        let maxVariance = 0;
        let threshold = 128;
        for (let i = 0; i < 256; i++) {
          wB += histogram[i];
          if (wB === 0) continue;
          const wF = total - wB;
          if (wF === 0) break;
          sumB += i * histogram[i];
          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;
          const variance = wB * wF * (mB - mF) * (mB - mF);
          if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
          }
        }
        // Apply binarization
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = gray > threshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      } else {
        // High contrast: aggressive contrast stretch + sharpen
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Very aggressive contrast: stretch to full range
          const contrast = 2.5;
          const val = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Run OCR on a compressed data URL string.
 * Uses multiple passes with different preprocessing to maximize quality.
 */
export async function runOcrOnDataUrl(dataUrl: string): Promise<string> {
  const w = await getWorker();

  // Pass 1: Original image
  const { data: result1 } = await w.recognize(dataUrl);
  const text1 = result1.text ?? "";
  const conf1 = result1.confidence ?? 0;

  // If good result, return it
  if (text1.trim().length > 50 && conf1 > 40) {
    return text1;
  }

  // Pass 2: Contrast-enhanced
  let bestText = text1;
  let bestScore = text1.trim().length * (conf1 / 100);

  try {
    const enhanced = await preprocessImage(dataUrl, "contrast");
    const { data: result2 } = await w.recognize(enhanced);
    const text2 = result2.text ?? "";
    const conf2 = result2.confidence ?? 0;
    const score2 = text2.trim().length * (conf2 / 100);
    if (score2 > bestScore) {
      bestText = text2;
      bestScore = score2;
    }
  } catch {
    // continue
  }

  // Pass 3: Binarized (Otsu threshold)
  try {
    const binarized = await preprocessImage(dataUrl, "binarize");
    const { data: result3 } = await w.recognize(binarized);
    const text3 = result3.text ?? "";
    const conf3 = result3.confidence ?? 0;
    const score3 = text3.trim().length * (conf3 / 100);
    if (score3 > bestScore) {
      bestText = text3;
      bestScore = score3;
    }
  } catch {
    // continue
  }

  // Pass 4: High contrast (for low-contrast labels)
  if (bestScore < 30) {
    try {
      const highContrast = await preprocessImage(dataUrl, "highcontrast");
      const { data: result4 } = await w.recognize(highContrast);
      const text4 = result4.text ?? "";
      const conf4 = result4.confidence ?? 0;
      const score4 = text4.trim().length * (conf4 / 100);
      if (score4 > bestScore) {
        bestText = text4;
      }
    } catch {
      // continue
    }
  }

  return bestText;
}

export async function terminateOcr(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
