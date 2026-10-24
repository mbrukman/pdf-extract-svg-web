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

import type { AspectRatioOption, SelectionRect } from '../types/pdf';

/**
 * Standard conversion constants:
 * 72 PostScript points = 1 inch
 * 1 inch = 25.4 millimeters
 */
export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;

/**
 * Clamps a number between a minimum and maximum boundary
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts PostScript points to inches string formatted to 2 decimals
 */
export function ptToInches(pt: number): string {
  if (isNaN(pt) || pt <= 0) return '0.00';
  return (pt / POINTS_PER_INCH).toFixed(2);
}

/**
 * Converts PostScript points to millimeters string formatted to 1 decimal
 */
export function ptToMm(pt: number): string {
  if (isNaN(pt) || pt <= 0) return '0.0';
  return (pt * (MM_PER_INCH / POINTS_PER_INCH)).toFixed(1);
}

/**
 * Constrains width and height according to a selected aspect ratio option
 */
export function constrainRatio(
  w: number,
  h: number,
  ratioOption: AspectRatioOption
): { width: number; height: number } {
  if (ratioOption === 'free') {
    return { width: w, height: h };
  }

  let targetRatio = 1;
  if (ratioOption === '1:1') targetRatio = 1;
  else if (ratioOption === '4:3') targetRatio = 4 / 3;
  else if (ratioOption === '16:9') targetRatio = 16 / 9;
  else if (ratioOption === '3:2') targetRatio = 3 / 2;
  else if (ratioOption === '1.618') targetRatio = 1.618;

  const currentRatio = Math.abs(w / (h || 1));
  if (currentRatio > targetRatio) {
    return { width: Math.abs(h * targetRatio), height: h };
  } else {
    return { width: w, height: Math.abs(w / targetRatio) };
  }
}

/**
 * Clamps a selection rectangle to lie entirely within the PDF page bounds
 */
export function clampSelection(
  rect: SelectionRect,
  pageSize: { widthPt: number; heightPt: number }
): SelectionRect {
  const x = clamp(rect.x, 0, Math.max(0, pageSize.widthPt));
  const y = clamp(rect.y, 0, Math.max(0, pageSize.heightPt));
  const width = clamp(rect.width, 0, Math.max(0, pageSize.widthPt - x));
  const height = clamp(rect.height, 0, Math.max(0, pageSize.heightPt - y));
  return { x, y, width, height };
}

/**
 * Calculates new coordinates when moving a selection rectangle
 */
export function moveSelection(
  initialRect: SelectionRect,
  dx: number,
  dy: number,
  pageSize: { widthPt: number; heightPt: number }
): SelectionRect {
  const x = clamp(initialRect.x + dx, 0, Math.max(0, pageSize.widthPt - initialRect.width));
  const y = clamp(initialRect.y + dy, 0, Math.max(0, pageSize.heightPt - initialRect.height));
  return {
    x,
    y,
    width: initialRect.width,
    height: initialRect.height,
  };
}

/**
 * Calculates new coordinates when resizing a selection rectangle via an 8-point handle
 */
export function resizeSelection(
  initialRect: SelectionRect,
  handle: string,
  dx: number,
  dy: number,
  pageSize: { widthPt: number; heightPt: number },
  minSize = 10
): SelectionRect {
  let x = initialRect.x;
  let y = initialRect.y;
  let w = initialRect.width;
  let h = initialRect.height;

  if (handle.includes('e')) {
    w = Math.max(minSize, initialRect.width + dx);
  }
  if (handle.includes('s')) {
    h = Math.max(minSize, initialRect.height + dy);
  }
  if (handle.includes('w')) {
    const potentialW = initialRect.width - dx;
    if (potentialW >= minSize) {
      x = initialRect.x + dx;
      w = potentialW;
    }
  }
  if (handle.includes('n')) {
    const potentialH = initialRect.height - dy;
    if (potentialH >= minSize) {
      y = initialRect.y + dy;
      h = potentialH;
    }
  }

  x = clamp(x, 0, pageSize.widthPt);
  y = clamp(y, 0, pageSize.heightPt);
  w = Math.min(w, pageSize.widthPt - x);
  h = Math.min(h, pageSize.heightPt - y);

  return { x, y, width: w, height: h };
}
