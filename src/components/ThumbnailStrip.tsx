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

import React, { useEffect, useRef, useState } from 'react';
import type { Document } from 'mupdf';
import { getMuPdf } from '../utils/mupdfHelper';

interface ThumbnailStripProps {
  doc: Document | null;
  currentPage: number;
  onSelectPage: (page: number) => void;
  totalPages: number;
}

interface ThumbnailItemProps {
  doc: Document;
  pageNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  doc,
  pageNumber,
  isSelected,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const renderThumb = async () => {
      try {
        const mupdf = await getMuPdf();
        if (isCancelled || !canvasRef.current) return;

        const page = doc.loadPage(pageNumber - 1); // 0-indexed in MuPDF
        const bounds = page.getBounds();
        const widthPt = bounds[2] - bounds[0];
        const heightPt = bounds[3] - bounds[1];

        // Scale to ~110px thumbnail width
        const thumbScale = Math.min(1.0, 110 / widthPt);
        const matrix = mupdf.Matrix.scale(thumbScale, thumbScale);

        // Alpha true generates RGBA buffer for standard Canvas ImageData
        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true);
        const pixW = pixmap.getWidth();
        const pixH = pixmap.getHeight();

        const canvas = canvasRef.current;
        canvas.width = pixW;
        canvas.height = pixH;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pixels = pixmap.getPixels();
        const imgData = ctx.createImageData(pixW, pixH);
        imgData.data.set(pixels);
        ctx.putImageData(imgData, 0, 0);

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn(`MuPDF thumbnail render warning for page ${pageNumber}:`, err);
        }
      }
    };

    renderThumb();

    return () => {
      isCancelled = true;
    };
  }, [doc, pageNumber]);

  return (
    <button
      onClick={onSelect}
      className={`w-full flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all cursor-pointer group text-left ${isSelected
          ? 'bg-neutral-100 ring-2 ring-neutral-900 shadow-xs'
          : 'hover:bg-neutral-100/70'
        }`}
    >
      <div className="relative w-full flex justify-center bg-white shadow-2xs rounded-xs overflow-hidden border border-neutral-200">
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
        {!isRendered && (
          <div className="w-full h-32 bg-neutral-100 animate-pulse flex items-center justify-center text-2xs text-neutral-400 font-mono">
            {pageNumber}
          </div>
        )}
      </div>
      <span className={`text-2xs font-mono tabular-nums ${isSelected ? 'font-semibold text-neutral-900' : 'text-neutral-500'}`}>
        Page {pageNumber}
      </span>
    </button>
  );
};

const ThumbnailStripComponent: React.FC<ThumbnailStripProps> = ({
  doc,
  currentPage,
  onSelectPage,
  totalPages,
}) => {
  if (!doc || totalPages <= 0) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="w-40 border-r border-neutral-200 bg-neutral-50/50 flex flex-col h-full shrink-0 select-none">
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {pageNumbers.map((num) => (
          <ThumbnailItem
            key={num}
            doc={doc}
            pageNumber={num}
            isSelected={num === currentPage}
            onSelect={() => onSelectPage(num)}
          />
        ))}
      </div>
    </div>
  );
};

export const ThumbnailStrip = React.memo(ThumbnailStripComponent);
