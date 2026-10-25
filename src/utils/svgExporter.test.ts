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

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { sanitizeSvgXml, exportRegionToSvg, downloadSvgFile } from './svgExporter';
import { getMuPdf } from './mupdfHelper';

/**
 * Creates a valid, minimal standard PDF byte stream containing vector paths
 */
async function createTestPdfBytes(): Promise<Uint8Array> {
  const mupdf = await getMuPdf();
  const doc = new mupdf.PDFDocument();
  const pageObj = doc.addPage(
    [0, 0, 500, 400],
    0,
    doc.newDictionary(),
    '0 0 1 rg 10 10 120 90 re f 1 0 0 RG 3 w 200 50 m 300 150 l S'
  );
  doc.insertPage(-1, pageObj);
  return doc.saveToBuffer('').asUint8Array();
}

describe('SVG Exporter & XML Sanitization', () => {
  describe('sanitizeSvgXml', () => {
    it('preserves valid SVG XML text, newlines, tabs, and bezier paths', () => {
      const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 10 20 C 30 40 50 60 70 80 Z" fill="#3b82f6" stroke="#1d4ed8" />
  <text x="10" y="20">Valid SVG text with accents: café, résumé, 100%</text>
</svg>`;
      expect(sanitizeSvgXml(validSvg)).toBe(validSvg);
    });

    it('strips illegal XML 1.0 control characters (e.g. \\x00, \\x01, \\x08, \\x0E, \\x1F, \\uFFFE)', () => {
      const dirty = '<svg><text>Hello\x00\x01\x08World\x0E\x1F\uFFFE</text></svg>';
      const cleaned = sanitizeSvgXml(dirty);
      expect(cleaned).toBe('<svg><text>HelloWorld</text></svg>');
    });

    it('converts vertical tab (\\x0B) and form feed (\\x0C) to standard space', () => {
      const dirty = '<svg><text>First\x0BSecond\x0CThird</text></svg>';
      const cleaned = sanitizeSvgXml(dirty);
      expect(cleaned).toBe('<svg><text>First Second Third</text></svg>');
    });

    it('removes forbidden XML numeric entities (e.g. &#11; or &#x0b;)', () => {
      const dirty = '<svg><text>Foo&#11;Bar&#x0b;Baz</text></svg>';
      const cleaned = sanitizeSvgXml(dirty);
      expect(cleaned).toBe('<svg><text>Foo Bar Baz</text></svg>');
    });

    it('preserves valid XML numeric entities like &#9; (tab) and &#65; (A)', () => {
      const validEntities = '<svg><text>&#9;&#65;</text></svg>';
      expect(sanitizeSvgXml(validEntities)).toBe('<svg><text>&#9;&#65;</text></svg>');
    });
  });

  describe('exportRegionToSvg', () => {
    let pdfBytes: Uint8Array;

    beforeAll(async () => {
      pdfBytes = await createTestPdfBytes();
    });

    it('extracts a vector region with authentic viewBox and dimensions', async () => {
      const crop = { x: 10, y: 10, width: 250, height: 180 };
      const result = await exportRegionToSvg(pdfBytes, 0, crop, 0, {
        backgroundColor: 'transparent',
        includeSelectableText: false,
      });

      expect(result).toBeDefined();
      expect(result.svgContent).toContain('<svg');
      expect(result.svgContent).toContain('viewBox="0 0 250 180"');
      expect(result.svgContent).toContain('width="250"');
      expect(result.svgContent).toContain('height="180"');
      expect(result.dimensions.widthPt).toBe(250);
      expect(result.dimensions.heightPt).toBe(180);
      expect(result.byteSize).toBeGreaterThan(0);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(typeof result.vectorPathsCount).toBe('number');
    });

    it('exports with transparent background by default (no white background rect)', async () => {
      const crop = { x: 0, y: 0, width: 100, height: 100 };
      const result = await exportRegionToSvg(pdfBytes, 0, crop, 0, {
        backgroundColor: 'transparent',
        includeSelectableText: false,
      });

      expect(result.svgContent).not.toContain('<rect width="100%" height="100%" fill="#ffffff" />');
    });

    it('inserts white background rect when backgroundColor is white', async () => {
      const crop = { x: 0, y: 0, width: 100, height: 100 };
      const result = await exportRegionToSvg(pdfBytes, 0, crop, 0, {
        backgroundColor: 'white',
        includeSelectableText: false,
      });

      expect(result.svgContent).toContain('<rect width="100%" height="100%" fill="#ffffff" />');
    });

    it('handles document rotation matrices (0, 90, 180, 270 degrees)', async () => {
      const crop = { x: 10, y: 10, width: 150, height: 120 };

      for (const rot of [0, 90, 180, 270]) {
        const result = await exportRegionToSvg(pdfBytes, 0, crop, rot, {
          backgroundColor: 'transparent',
          includeSelectableText: false,
        });

        expect(result.svgContent).toContain('<svg');
        expect(result.dimensions.widthPt).toBe(150);
        expect(result.dimensions.heightPt).toBe(120);
      }
    });

    it('throws error when passed corrupted or invalid PDF bytes', async () => {
      // MuPDF outputs diagnostics when attempting to repair invalid PDF bytes.
      // We route MuPDF's log handler to a no-op so expected failure logging does not pollute test output.
      const mupdf = await getMuPdf();
      mupdf.setLog(() => {});
      try {
        const invalidBytes = new Uint8Array([1, 2, 3, 4, 5]);
        await expect(
          exportRegionToSvg(invalidBytes, 0, { x: 0, y: 0, width: 100, height: 100 }, 0, {
            backgroundColor: 'transparent',
            includeSelectableText: false,
          })
        ).rejects.toThrow();
      } finally {
        mupdf.setLog(null);
      }
    });
  });

  describe('downloadSvgFile', () => {
    it('creates an anchor tag and triggers download with correct filename when document exists', () => {
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const appendChild = vi.fn();
      const removeChild = vi.fn();

      const originalDocument = globalThis.document;
      globalThis.document = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild,
          removeChild,
        },
      } as unknown as Document;

      const blob = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
      downloadSvgFile(blob, 'my_diagram');

      expect(globalThis.document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('my_diagram.svg');
      expect(appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(mockAnchor);

      globalThis.document = originalDocument;
    });
  });
});
