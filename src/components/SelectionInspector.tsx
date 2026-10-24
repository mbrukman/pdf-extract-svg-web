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

import React from 'react';
import { Download, Sliders, Maximize, Trash2 } from 'lucide-react';
import type { AspectRatioOption, SelectionRect } from '../types/pdf';
import { ptToInches, ptToMm } from '../utils/geometry';

interface SelectionInspectorProps {
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
  pageSize: { widthPt: number; heightPt: number };
  aspectRatio: AspectRatioOption;
  onAspectRatioChange: (ratio: AspectRatioOption) => void;
  onSaveSelection: () => void;
}

const SelectionInspectorComponent: React.FC<SelectionInspectorProps> = ({
  selection,
  onSelectionChange,
  pageSize,
  aspectRatio,
  onAspectRatioChange,
  onSaveSelection,
}) => {
  if (!selection || selection.width <= 0 || selection.height <= 0) {
    return (
      <div className="w-64 border-l border-neutral-200 bg-white p-4 flex flex-col justify-between shrink-0 select-none text-neutral-600">
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 text-neutral-900 font-medium text-xs">
            <Sliders className="w-3.5 h-3.5 text-neutral-500" />
            <span>Region Inspector</span>
          </div>

          <div className="py-8 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 mb-3">
              <Maximize className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-neutral-800 mb-1">No region selected</p>
            <p className="text-2xs text-neutral-400 leading-relaxed px-2">
              Click and drag anywhere on the page to draw a crop box to export to SVG.
            </p>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 text-2xs space-y-1.5">
            <div className="font-medium text-neutral-700">Quick Tips</div>
            <div className="text-neutral-500 flex items-start gap-1.5">
              <span>•</span>
              <span>Drag corners to resize</span>
            </div>
            <div className="text-neutral-500 flex items-start gap-1.5">
              <span>•</span>
              <span>Drag inside the box to move it</span>
            </div>
            <div className="text-neutral-500 flex items-start gap-1.5">
              <span>•</span>
              <span>Hold Space to pan around large pages</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unit conversions: 72 points = 1 inch = 25.4 mm
  const widthInches = ptToInches(selection.width);
  const heightInches = ptToInches(selection.height);
  const widthMm = ptToMm(selection.width);
  const heightMm = ptToMm(selection.height);

  const updateProp = (prop: keyof SelectionRect, val: number) => {
    let nextVal = isNaN(val) ? 0 : val;
    const nextRect = { ...selection };

    if (prop === 'x') {
      nextVal = Math.max(0, Math.min(nextVal, pageSize.widthPt - selection.width));
      nextRect.x = nextVal;
    } else if (prop === 'y') {
      nextVal = Math.max(0, Math.min(nextVal, pageSize.heightPt - selection.height));
      nextRect.y = nextVal;
    } else if (prop === 'width') {
      nextVal = Math.max(10, Math.min(nextVal, pageSize.widthPt - selection.x));
      nextRect.width = nextVal;
    } else if (prop === 'height') {
      nextVal = Math.max(10, Math.min(nextVal, pageSize.heightPt - selection.y));
      nextRect.height = nextVal;
    }

    onSelectionChange(nextRect);
  };

  const handleCenter = () => {
    const x = Math.max(0, (pageSize.widthPt - selection.width) / 2);
    const y = Math.max(0, (pageSize.heightPt - selection.height) / 2);
    onSelectionChange({ ...selection, x, y });
  };

  const handleFillWidth = () => {
    onSelectionChange({ ...selection, x: 0, width: pageSize.widthPt });
  };

  const handleFillHeight = () => {
    onSelectionChange({ ...selection, y: 0, height: pageSize.heightPt });
  };

  return (
    <div className="w-64 border-l border-neutral-200 bg-white p-4 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs">
            <Sliders className="w-3.5 h-3.5 text-neutral-600" />
            <span>Region Inspector</span>
          </div>
          <button
            onClick={() => onSelectionChange(null)}
            className="text-neutral-400 hover:text-rose-600 transition-colors p-1 rounded cursor-pointer"
            title="Clear selection"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dimension Metric Card */}
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
          <div className="text-2xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">
            Output Dimensions
          </div>
          <div className="text-base font-bold text-neutral-900 font-mono tabular-nums">
            {Math.round(selection.width)} × {Math.round(selection.height)} <span className="text-xs font-normal text-neutral-500">pt</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-2xs text-neutral-500 font-mono">
            <span>{widthInches} × {heightInches} in</span>
            <span aria-hidden="true">·</span>
            <span>{widthMm} × {heightMm} mm</span>
          </div>
        </div>

        {/* Numeric Precision Controls */}
        <div className="space-y-2.5">
          <div className="text-2xs font-semibold text-neutral-500 uppercase tracking-wider">
            Coordinates & Size (pt)
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-3xs text-neutral-500 font-mono block mb-0.5">X Position</label>
              <input
                type="number"
                value={Math.round(selection.x)}
                onChange={(e) => updateProp('x', parseInt(e.target.value, 10))}
                className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-xs font-mono tabular-nums text-neutral-800 focus:outline-hidden focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="text-3xs text-neutral-500 font-mono block mb-0.5">Y Position</label>
              <input
                type="number"
                value={Math.round(selection.y)}
                onChange={(e) => updateProp('y', parseInt(e.target.value, 10))}
                className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-xs font-mono tabular-nums text-neutral-800 focus:outline-hidden focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="text-3xs text-neutral-500 font-mono block mb-0.5">Width</label>
              <input
                type="number"
                value={Math.round(selection.width)}
                onChange={(e) => updateProp('width', parseInt(e.target.value, 10))}
                className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-xs font-mono tabular-nums text-neutral-800 focus:outline-hidden focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="text-3xs text-neutral-500 font-mono block mb-0.5">Height</label>
              <input
                type="number"
                value={Math.round(selection.height)}
                onChange={(e) => updateProp('height', parseInt(e.target.value, 10))}
                className="w-full px-2 py-1 bg-white border border-neutral-300 rounded text-xs font-mono tabular-nums text-neutral-800 focus:outline-hidden focus:border-neutral-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Alignment Helpers */}
        <div className="space-y-1.5 pt-1">
          <div className="text-2xs font-semibold text-neutral-500 uppercase tracking-wider">
            Quick Alignment
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-2xs">
            <button
              onClick={handleCenter}
              className="px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 transition-colors cursor-pointer text-center font-medium"
            >
              Center
            </button>
            <button
              onClick={handleFillWidth}
              className="px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 transition-colors cursor-pointer text-center font-medium"
            >
              Full W
            </button>
            <button
              onClick={handleFillHeight}
              className="px-2 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 transition-colors cursor-pointer text-center font-medium"
            >
              Full H
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-neutral-100 mt-4">
        <button
          onClick={onSaveSelection}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 active:scale-98 transition-all text-xs font-medium cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Save as SVG</span>
        </button>
      </div>
    </div>
  );
};

export const SelectionInspector = React.memo(SelectionInspectorComponent);
