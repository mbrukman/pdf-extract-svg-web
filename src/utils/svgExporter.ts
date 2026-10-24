// Copyright (c) 2026 Misha Brukman
// SPDX: AGPL-3.0-only
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero General Public License version 3.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
// details.

/**
 * MuPDF Vector SVG Exporter
 * Extracts the exact underlying vector data (curves, paths, strokes, fills, font glyphs)
 * directly from the original PDF binary without any rasterization.
 * Includes strict XML 1.0 sanitization to prevent invalid character errors (e.g. U+000B).
 */
import { getMuPdf } from './mupdfHelper';

export interface CropRect {
  x: number; // in PDF points (unscaled viewport from top-left)
  y: number;
  width: number;
  height: number;
}

export interface SvgExportOptions {
  backgroundColor: 'transparent' | 'white';
  includeSelectableText: boolean;
  filename?: string;
  addClipPath?: boolean;
}

export interface ExportResult {
  svgContent: string;
  blob: Blob;
  dataUrl: string;
  byteSize: number;
  dimensions: {
    widthPt: number;
    heightPt: number;
  };
  vectorPathsCount: number;
  glyphUsesCount: number;
}

/**
 * Escapes XML entity characters AND removes any non-XML 1.0 control characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, (char) =>
      char === '\x0B' || char === '\x0C' ? ' ' : ''
    )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitizes an SVG XML string to ensure strict XML 1.0 conformance.
 * In XML 1.0, only #x9 (tab), #xA (newline), #xD (carriage return), and #x20-#xD7FF,
 * #xE000-#xFFFD, #x10000-#x10FFFF are permissible.
 * Characters like U+000B (vertical tab \x0b), U+000C (form feed \x0c), U+0000-U+0008,
 * and U+000E-U+001F are strictly illegal in XML 1.0 and cause browser XML parsers to fail.
 */
export function sanitizeSvgXml(xml: string): string {
  // 1. Replace illegal XML 1.0 control characters
  let sanitized = xml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, (char) => {
    // For vertical tab \x0B and form feed \x0C, convert to standard space
    if (char === '\x0B' || char === '\x0C') {
      return ' ';
    }
    return '';
  });

  // 2. Remove numeric entity references for forbidden characters (e.g. &#11; or &#x0b;)
  sanitized = sanitized.replace(/&#(x[0-9a-fA-F]+|\d+);?/gi, (match, code) => {
    const num = code.startsWith('x') || code.startsWith('X') ? parseInt(code.slice(1), 16) : parseInt(code, 10);
    // In XML 1.0, allowed control chars are 0x9 (tab), 0xA (newline), 0xD (carriage return).
    // All other characters below 0x20 and 0xFFFE/0xFFFF are illegal in XML 1.0.
    if ((num < 0x20 && num !== 0x09 && num !== 0x0a && num !== 0x0d) || num === 0xfffe || num === 0xffff) {
      return ' ';
    }
    return match;
  });

  return sanitized;
}

/**
 * Extracts structured text elements from MuPDF page that intersect the crop box
 */
function extractStructuredTextLayer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  crop: CropRect,
  rotation: number
): string {
  try {
    const structuredText = page.toStructuredText({});
    const jsonStr = structuredText.asJSON();
    const data = JSON.parse(jsonStr);

    if (!data.blocks || !Array.isArray(data.blocks)) return '';

    const textElements: string[] = [];

    for (const block of data.blocks) {
      if (block.type !== 'text' || !Array.isArray(block.lines)) continue;

      for (const line of block.lines) {
        if (!line.text || !line.bbox) continue;

        // Check if line bounding box intersects crop box
        const lx = line.bbox.x;
        const ly = line.bbox.y;
        const lw = line.bbox.w;
        const lh = line.bbox.h;

        const intersects =
          lx + lw >= crop.x &&
          lx <= crop.x + crop.width &&
          ly + lh >= crop.y &&
          ly <= crop.y + crop.height;

        if (intersects) {
          const relX = Number((lx - crop.x).toFixed(2));
          const relY = Number((line.y - crop.y).toFixed(2));
          const fontSize = line.font?.size || 12;
          const fontFamily = line.font?.name ? escapeXml(line.font.name) : 'sans-serif';
          const text = escapeXml(line.text);

          textElements.push(
            `    <text x="${relX}" y="${relY}" font-size="${fontSize}" font-family="${fontFamily}" fill="transparent" fill-opacity="0" data-selectable="true">${text}</text>`
          );
        }
      }
    }

    if (textElements.length === 0) return '';

    return `  <!-- Selectable vector text layer -->\n  <g id="pdf-selectable-text" aria-hidden="true">\n${textElements.join('\n')}\n  </g>\n`;
  } catch (err) {
    console.warn('Failed to extract structured text overlay:', err);
    return '';
  }
}

/**
 * Exports the selected rectangular region of a PDF page as pure vector SVG using MuPDF
 */
export async function exportRegionToVectorSvg(
  rawPdfBytes: Uint8Array,
  pageIndex: number, // 0-indexed
  crop: CropRect,
  rotation: number,
  options: SvgExportOptions
): Promise<ExportResult> {
  const mupdf = await getMuPdf();

  // Open the PDF directly from the raw original bytes
  const doc = mupdf.Document.openDocument(rawPdfBytes, 'application/pdf');
  const page = doc.loadPage(pageIndex);

  const bounds = page.getBounds(); // [x0, y0, x1, y1]
  const pageW = bounds[2] - bounds[0];
  const pageH = bounds[3] - bounds[1];

  const widthPt = Number(crop.width.toFixed(2));
  const heightPt = Number(crop.height.toFixed(2));

  // Initialize MuPDF SVG DocumentWriter
  const outBuf = new mupdf.Buffer();
  const writer = new mupdf.DocumentWriter(outBuf, 'svg', '');
  const dev = writer.beginPage([0, 0, widthPt, heightPt]);

  // Compute transformation matrix for rotation + crop translation
  let matrix = mupdf.Matrix.identity;
  if (rotation === 90) {
    matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(90), mupdf.Matrix.translate(pageH, 0));
  } else if (rotation === 180) {
    matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(180), mupdf.Matrix.translate(pageW, pageH));
  } else if (rotation === 270) {
    matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(270), mupdf.Matrix.translate(0, pageW));
  }

  // Translate to selection top-left
  matrix = mupdf.Matrix.concat(matrix, mupdf.Matrix.translate(-crop.x, -crop.y));

  // Run MuPDF vector device to write actual underlying PDF vector graphics (paths, glyphs, strokes, fills)
  page.run(dev, matrix);
  writer.endPage();
  writer.close();

  let rawSvg = outBuf.asString();

  // If rawSvg doesn't start with <svg, normalize
  if (!rawSvg.includes('<svg')) {
    throw new Error('MuPDF failed to generate SVG stream');
  }

  // Ensure standard SVG headers & attributes
  if (!rawSvg.includes('viewBox')) {
    rawSvg = rawSvg.replace(
      '<svg ',
      `<svg viewBox="0 0 ${widthPt} ${heightPt}" width="${widthPt}pt" height="${heightPt}pt" `
    );
  }

  // Count vector paths & glyph uses for metadata inspection
  const pathMatches = rawSvg.match(/<path /g);
  const useMatches = rawSvg.match(/<use /g);
  const vectorPathsCount = pathMatches ? pathMatches.length : 0;
  const glyphUsesCount = useMatches ? useMatches.length : 0;

  // Enhance SVG with background & optional clip boundary
  let enhancedSvg = rawSvg;

  // Insert background rect if white background selected
  if (options.backgroundColor === 'white') {
    const bgRect = `\n  <!-- Background -->\n  <rect width="100%" height="100%" fill="#ffffff" />`;
    const defsIndex = enhancedSvg.indexOf('</defs>');
    if (defsIndex !== -1) {
      enhancedSvg =
        enhancedSvg.slice(0, defsIndex + 7) + bgRect + enhancedSvg.slice(defsIndex + 7);
    } else {
      const svgTagClose = enhancedSvg.indexOf('>') + 1;
      enhancedSvg =
        enhancedSvg.slice(0, svgTagClose) + bgRect + enhancedSvg.slice(svgTagClose);
    }
  }

  // Add optional selectable text layer
  if (options.includeSelectableText) {
    const textLayerXml = extractStructuredTextLayer(page, crop, rotation);
    if (textLayerXml) {
      const svgEndIndex = enhancedSvg.lastIndexOf('</svg>');
      if (svgEndIndex !== -1) {
        enhancedSvg =
          enhancedSvg.slice(0, svgEndIndex) + textLayerXml + enhancedSvg.slice(svgEndIndex);
      }
    }
  }

  // CRITICAL: Strict XML 1.0 sanitization
  // Strips any U+000B (vertical tab \x0b), U+000C, or other illegal XML control characters
  // that would trigger browser XML parsing errors.
  const finalSvg = sanitizeSvgXml(enhancedSvg);

  // Validate using browser DOMParser if available to verify XML compliance
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(finalSvg, 'image/svg+xml');
      const parserError = parsedDoc.querySelector('parsererror');
      if (parserError) {
        console.warn('SVG validation warning:', parserError.textContent);
      }
    } catch (e) {
      console.warn('DOMParser validation check skipped:', e);
    }
  }

  const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
  const dataUrl = URL.createObjectURL(blob);

  return {
    svgContent: finalSvg,
    blob,
    dataUrl,
    byteSize: blob.size,
    dimensions: {
      widthPt,
      heightPt,
    },
    vectorPathsCount,
    glyphUsesCount,
  };
}

/**
 * Triggers browser download of the SVG file
 */
export function downloadSvgFile(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
