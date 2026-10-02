import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import type { OCRPageResult } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type { OCRDocumentResult, OCRPageResult, OCRTextBlock } from '../types';

type OCRProgressCallback = (progress: number, status: string) => void;

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isDocx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx')
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

function toPageResult(
  result: Tesseract.RecognizeResult,
  pageNumber: number,
): OCRPageResult {
  const words = result.data.words || [];
  return {
    pageNumber,
    text: result.data.text?.trim() || '',
    confidence: result.data.confidence ?? 0,
    method: 'ocr',
    blocks: words.map((word) => ({
      text: word.text || '',
      confidence: word.confidence ?? 0,
      bbox: [
        word.bbox?.x0 ?? 0,
        word.bbox?.y0 ?? 0,
        word.bbox?.x1 ?? 0,
        word.bbox?.y1 ?? 0,
      ],
    })),
  };
}

async function runDocxTextExtraction(file: File): Promise<OCRPageResult[]> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = result.value.trim();
  if (!text) throw new Error('No readable text was found in this Word document.');

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return [{
    pageNumber: 1,
    text,
    confidence: 100,
    method: 'document-text',
    blocks: lines.map((line) => ({
      text: line,
      confidence: 100,
      bbox: [0, 0, 0, 0],
    })),
  }];
}

async function runImageOcr(
  file: File,
  onProgress?: OCRProgressCallback,
): Promise<OCRPageResult[]> {
  const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
    workerPath: tesseractWorkerUrl,
    workerBlobURL: false,
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(message.progress, 'Recognizing text');
      }
    },
  });

  try {
    const result = await worker.recognize(file);
    return [toPageResult(result, 1)];
  } finally {
    await worker.terminate();
  }
}

async function runPdfOcr(
  file: File,
  onProgress?: OCRProgressCallback,
): Promise<OCRPageResult[]> {
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  let worker: Tesseract.Worker | null = null;
  const pages: OCRPageResult[] = [];
  let currentPage = 1;

  try {
    worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
      workerPath: tesseractWorkerUrl,
      workerBlobURL: false,
      logger: (message) => {
        if (message.status === 'recognizing text') {
          const overallProgress = (message.progress + currentPage - 1) / pdf.numPages;
          onProgress?.(overallProgress, `Recognizing page ${currentPage} of ${pdf.numPages}`);
        }
      },
    });

    for (; currentPage <= pdf.numPages; currentPage += 1) {
      onProgress?.((currentPage - 1) / pdf.numPages, `Preparing page ${currentPage} of ${pdf.numPages}`);
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser does not support canvas rendering required for PDF OCR.');

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvas, viewport }).promise;
        const result = await worker.recognize(canvas);
        pages.push(toPageResult(result, currentPage));
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    if (worker) await worker.terminate();
    await loadingTask.destroy();
  }

  return pages;
}

export async function runLocalOcr(
  file: File,
  onProgress?: OCRProgressCallback,
): Promise<{
  fullText: string;
  pages: OCRPageResult[];
  extractionMethod: 'ocr' | 'document-text';
  processingTimeMs: number;
}> {
  const startedAt = performance.now();
  let pages: OCRPageResult[];
  let extractionMethod: 'ocr' | 'document-text';

  if (isPdf(file)) {
    extractionMethod = 'ocr';
    pages = await runPdfOcr(file, onProgress);
  } else if (isImage(file)) {
    extractionMethod = 'ocr';
    pages = await runImageOcr(file, onProgress);
  } else if (isDocx(file)) {
    extractionMethod = 'document-text';
    onProgress?.(0.5, 'Extracting Word document text');
    pages = await runDocxTextExtraction(file);
    onProgress?.(1, 'Text extraction complete');
  } else {
    throw new Error('Choose a PDF, DOCX, or image file. Legacy DOC files are not supported.');
  }

  const fullText = pages.map((page) => page.text).filter(Boolean).join('\n\n');
  if (!fullText) throw new Error('No readable text was found in this file.');

  return {
    fullText,
    pages,
    extractionMethod,
    processingTimeMs: Math.round(performance.now() - startedAt),
  };
}
