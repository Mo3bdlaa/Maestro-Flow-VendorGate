import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CHARS = 30000;
const MAX_PAGES = 20;

/**
 * Extract readable text from an uploaded document in the browser, so the
 * orchestration flow can run generative extraction without ever needing to
 * open the binary. Returns '' when nothing is extractable (e.g. scanned
 * image PDFs) — the flow's extraction agent reports that as a gap.
 */
export async function extractFileText(file: File): Promise<string> {
  try {
    const name = file.name.toLowerCase();
    if (file.type === 'text/plain' || name.endsWith('.txt')) {
      return (await file.text()).slice(0, MAX_CHARS);
    }
    if (!(file.type === 'application/pdf' || name.endsWith('.pdf'))) return '';
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const parts: string[] = [];
    let total = 0;
    for (let p = 1; p <= Math.min(pdf.numPages, MAX_PAGES) && total < MAX_CHARS; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const text = tc.items
        .map((i) => ('str' in i ? i.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(text);
      total += text.length;
    }
    return parts.join('\n').slice(0, MAX_CHARS);
  } catch {
    return '';
  }
}
