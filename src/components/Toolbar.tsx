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

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Upload,
  Crop,
  Hand,
  Trash2,
  Sidebar,
} from 'lucide-react';
import type { AspectRatioOption, ToolMode } from '../types/pdf';

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  rotation: number;
  onRotate: () => void;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  aspectRatio: AspectRatioOption;
  onAspectRatioChange: (ratio: AspectRatioOption) => void;
  hasSelection: boolean;
  onClearSelection: () => void;
  onUploadFile: (file: File) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  isLoading: boolean;
}

const ToolbarComponent: React.FC<ToolbarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  scale,
  onScaleChange,
  onFitWidth,
  onFitPage,
  rotation,
  onRotate,
  toolMode,
  onToolModeChange,
  aspectRatio,
  onAspectRatioChange,
  hasSelection,
  onClearSelection,
  onUploadFile,
  showSidebar,
  onToggleSidebar,
  isLoading,
}) => {
  const [jumpInput, setJumpInput] = useState(currentPage.toString());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Keep jump input in sync with currentPage
  React.useEffect(() => {
    setJumpInput(currentPage.toString());
  }, [currentPage]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setJumpInput(currentPage.toString());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-700 select-none">
      {/* Group 1: File & Samples */}
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100 rounded-md font-medium text-neutral-800 transition-colors cursor-pointer shadow-2xs"
          title="Open your PDF from disk"
        >
          <Upload className="w-3.5 h-3.5 text-neutral-600" />
          <span>Open PDF</span>
        </button>


        <button
          onClick={onToggleSidebar}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors cursor-pointer ${showSidebar
              ? 'bg-neutral-200/80 border-neutral-300 text-neutral-900 font-medium'
              : 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-600'
            }`}
          title="Toggle thumbnails and coordinates panel"
        >
          <Sidebar className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Panel</span>
        </button>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-5 w-px bg-neutral-200" />

      {/* Group 2: Page Navigation & Jump */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 mx-1">
          <span className="text-neutral-500 text-xs">Page</span>
          <input
            type="text"
            inputMode="numeric"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={handleJumpSubmit}
            disabled={isLoading || totalPages <= 0}
            className="w-11 px-1.5 py-0.5 text-center bg-white border border-neutral-300 rounded text-xs font-mono font-medium text-neutral-900 focus:outline-hidden focus:border-neutral-500"
            title="Type a page number and hit Enter to jump"
          />
          <span className="text-neutral-500 text-xs">of <span className="font-mono">{totalPages || 1}</span></span>
        </form>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Next Page (Right Arrow)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || isLoading}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="hidden md:block h-5 w-px bg-neutral-200" />

      {/* Group 3: Zoom & View Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onScaleChange(Math.max(0.25, Math.round((scale - 0.15) * 100) / 100))}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onScaleChange(1.0)}
          className="px-2 py-1 rounded hover:bg-neutral-200 font-mono text-neutral-800 text-xs transition-colors cursor-pointer font-medium"
          title="Reset Zoom to 100%"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          onClick={() => onScaleChange(Math.min(3.5, Math.round((scale + 0.15) * 100) / 100))}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onFitWidth}
          className="px-2 py-1 bg-white border border-neutral-300 hover:bg-neutral-100 rounded text-neutral-700 transition-colors cursor-pointer text-xs"
          title="Fit page width to viewport"
        >
          Fit Width
        </button>

        <button
          onClick={onRotate}
          className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer ml-1"
          title={`Rotate Page Clockwise (currently ${rotation}°)`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="hidden lg:block h-5 w-px bg-neutral-200" />

      {/* Group 4: Selection Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Tool Mode: Select vs Pan */}
        <div className="flex items-center bg-white border border-neutral-300 rounded-md p-0.5">
          <button
            onClick={() => onToolModeChange('select')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${toolMode === 'select'
                ? 'bg-neutral-900 text-white font-medium'
                : 'text-neutral-600 hover:text-neutral-900'
              }`}
            title="Crop Selection Tool: drag on canvas to draw a box"
          >
            <Crop className="w-3 h-3" />
            <span>Select</span>
          </button>
          <button
            onClick={() => onToolModeChange('pan')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${toolMode === 'pan'
                ? 'bg-neutral-900 text-white font-medium'
                : 'text-neutral-600 hover:text-neutral-900'
              }`}
            title="Pan Hand Tool: click and drag to pan viewport"
          >
            <Hand className="w-3 h-3" />
            <span>Pan</span>
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <select
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value as AspectRatioOption)}
          className="bg-white border border-neutral-300 rounded-md px-2 py-1 text-xs text-neutral-700 focus:outline-hidden cursor-pointer"
          title="Lock selection aspect ratio"
        >
          <option value="free">Ratio: Free</option>
          <option value="1:1">Ratio: 1:1 (Square)</option>
          <option value="4:3">Ratio: 4:3</option>
          <option value="16:9">Ratio: 16:9</option>
          <option value="3:2">Ratio: 3:2</option>
          <option value="1.618">Ratio: Golden</option>
        </select>


        {hasSelection && (
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1 px-2 py-1 rounded text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-xs"
            title="Clear current selection rectangle"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const Toolbar = React.memo(ToolbarComponent);
