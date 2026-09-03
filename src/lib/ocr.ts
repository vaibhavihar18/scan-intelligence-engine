/**
 * Client-side OCR using tesseract.js.
 * Reads actual image files and returns extracted text.
 * Works entirely in the browser — no API key required.
 */
import { createWorker, type Worker } from "tesseract.js";

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker("eng+hin", undefined, {
      // Use CDN-hosted trained data
      logger: undefined,
    });
  }
  return worker;
}

/**
 * Run OCR on an image file (JPG/PNG/WEBP).
 * Returns the raw extracted text.
 */
export async function runOcrOnImage(file: File): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(file);
  return data.text ?? "";
}

/**
 * Run OCR on a compressed data URL string.
 * Returns the raw extracted text.
 */
export async function runOcrOnDataUrl(dataUrl: string): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(dataUrl);
  return data.text ?? "";
}

/** Terminate the OCR worker when no longer needed. */
export async function terminateOcr(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
