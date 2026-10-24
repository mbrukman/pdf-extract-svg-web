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

import { describe, it, expect } from 'vitest';
import {
  clamp,
  ptToInches,
  ptToMm,
  constrainRatio,
  clampSelection,
  moveSelection,
  resizeSelection,
  POINTS_PER_INCH,
  MM_PER_INCH,
} from './geometry';

describe('Geometry & Conversion Utilities', () => {
  describe('clamp', () => {
    it('returns the value when inside bounds', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(0, 0, 100)).toBe(0);
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it('clamps values below minimum', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(-0.5, 0, 100)).toBe(0);
    });

    it('clamps values above maximum', () => {
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(100.1, 0, 100)).toBe(100);
    });
  });

  describe('ptToInches', () => {
    it('correctly converts 72 PostScript points to 1.00 inch', () => {
      expect(ptToInches(POINTS_PER_INCH)).toBe('1.00');
      expect(ptToInches(144)).toBe('2.00');
      expect(ptToInches(36)).toBe('0.50');
      expect(ptToInches(216)).toBe('3.00');
    });

    it('handles zero, negative, and invalid values gracefully', () => {
      expect(ptToInches(0)).toBe('0.00');
      expect(ptToInches(-50)).toBe('0.00');
      expect(ptToInches(NaN)).toBe('0.00');
    });
  });

  describe('ptToMm', () => {
    it('correctly converts 72 PostScript points to 25.4 mm', () => {
      expect(ptToMm(POINTS_PER_INCH)).toBe('25.4');
      expect(ptToMm(144)).toBe('50.8');
    });

    it('handles zero and negative values gracefully', () => {
      expect(ptToMm(0)).toBe('0.0');
      expect(ptToMm(-20)).toBe('0.0');
      expect(ptToMm(NaN)).toBe('0.0');
    });
  });

  describe('constrainRatio', () => {
    it('preserves dimensions for "free" aspect ratio', () => {
      const result = constrainRatio(350, 120, 'free');
      expect(result).toEqual({ width: 350, height: 120 });
    });

    it('constrains to 1:1 square ratio', () => {
      // Wider than tall -> width constrained to height
      const wider = constrainRatio(200, 100, '1:1');
      expect(wider.width).toBeCloseTo(100);
      expect(wider.height).toBeCloseTo(100);

      // Taller than wide -> height constrained to width
      const taller = constrainRatio(100, 200, '1:1');
      expect(taller.width).toBeCloseTo(100);
      expect(taller.height).toBeCloseTo(100);
    });

    it('constrains to 4:3 aspect ratio', () => {
      const result = constrainRatio(400, 200, '4:3');
      expect(result.width / result.height).toBeCloseTo(4 / 3, 2);
    });

    it('constrains to 16:9 aspect ratio', () => {
      const result = constrainRatio(1600, 500, '16:9');
      expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
    });

    it('constrains to 3:2 photographic ratio', () => {
      const result = constrainRatio(300, 100, '3:2');
      expect(result.width / result.height).toBeCloseTo(3 / 2, 2);
    });

    it('constrains to 1.618 golden ratio', () => {
      const result = constrainRatio(200, 100, '1.618');
      expect(result.width / result.height).toBeCloseTo(1.618, 2);
    });
  });

  describe('clampSelection', () => {
    const pageSize = { widthPt: 612, heightPt: 792 };

    it('keeps a valid selection unchanged', () => {
      const rect = { x: 50, y: 50, width: 200, height: 300 };
      expect(clampSelection(rect, pageSize)).toEqual(rect);
    });

    it('clamps negative x and y to 0', () => {
      const rect = { x: -20, y: -40, width: 100, height: 100 };
      const clamped = clampSelection(rect, pageSize);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBe(100);
      expect(clamped.height).toBe(100);
    });

    it('clamps width and height that exceed page boundaries', () => {
      const rect = { x: 500, y: 700, width: 200, height: 200 };
      const clamped = clampSelection(rect, pageSize);
      expect(clamped.x).toBe(500);
      expect(clamped.y).toBe(700);
      expect(clamped.width).toBe(112); // 612 - 500
      expect(clamped.height).toBe(92); // 792 - 700
    });
  });

  describe('moveSelection', () => {
    const pageSize = { widthPt: 612, heightPt: 792 };
    const initialRect = { x: 100, y: 100, width: 200, height: 150 };

    it('moves selection by delta dx and dy within bounds', () => {
      const moved = moveSelection(initialRect, 50, 30, pageSize);
      expect(moved).toEqual({ x: 150, y: 130, width: 200, height: 150 });
    });

    it('stops selection at the left and top edges', () => {
      const moved = moveSelection(initialRect, -200, -250, pageSize);
      expect(moved.x).toBe(0);
      expect(moved.y).toBe(0);
      expect(moved.width).toBe(200);
      expect(moved.height).toBe(150);
    });

    it('stops selection at the right and bottom edges', () => {
      const moved = moveSelection(initialRect, 1000, 1000, pageSize);
      expect(moved.x).toBe(412); // 612 - 200
      expect(moved.y).toBe(642); // 792 - 150
      expect(moved.width).toBe(200);
      expect(moved.height).toBe(150);
    });
  });

  describe('resizeSelection', () => {
    const pageSize = { widthPt: 612, heightPt: 792 };
    const initialRect = { x: 100, y: 100, width: 200, height: 150 };

    it('resizes via east handle (e)', () => {
      const resized = resizeSelection(initialRect, 'e', 50, 0, pageSize);
      expect(resized).toEqual({ x: 100, y: 100, width: 250, height: 150 });
    });

    it('resizes via south handle (s)', () => {
      const resized = resizeSelection(initialRect, 's', 0, 40, pageSize);
      expect(resized).toEqual({ x: 100, y: 100, width: 200, height: 190 });
    });

    it('resizes via west handle (w) adjusting x and width', () => {
      const resized = resizeSelection(initialRect, 'w', 50, 0, pageSize);
      expect(resized.x).toBe(150);
      expect(resized.width).toBe(150);
    });

    it('resizes via north handle (n) adjusting y and height', () => {
      const resized = resizeSelection(initialRect, 'n', 0, 30, pageSize);
      expect(resized.y).toBe(130);
      expect(resized.height).toBe(120);
    });

    it('enforces minimum size of 10 points when shrinking', () => {
      const resized = resizeSelection(initialRect, 'e', -300, 0, pageSize, 10);
      expect(resized.width).toBe(10);
    });

    it('clamps resizing to page boundaries', () => {
      const resized = resizeSelection(initialRect, 'se', 1000, 1000, pageSize);
      expect(resized.x + resized.width).toBe(pageSize.widthPt);
      expect(resized.y + resized.height).toBe(pageSize.heightPt);
    });
  });
});
