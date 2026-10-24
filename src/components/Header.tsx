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
import { Download, HelpCircle } from 'lucide-react';

interface HeaderProps {
  filename?: string;
  hasSelection: boolean;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  currentPage?: number;
  totalPages?: number;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  filename,
  hasSelection,
  onOpenExport,
  onOpenShortcuts,
}) => {
  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-4 md:px-6 flex items-center justify-between gap-8 shrink-0 z-30 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 hover:text-neutral-700 transition-colors"
        >
          PDF extract SVG
        </a>
      </div>

      {/* Zone 2: Document Context & Info Links */}
      <div className="hidden md:flex items-center gap-6 text-xs text-neutral-500 whitespace-nowrap shrink-0">
        {filename && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-neutral-800 font-medium truncate max-w-xs">{filename}</span>
          </div>
        )}

        <button
          onClick={onOpenShortcuts}
          className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer py-1"
          title="View Keyboard Shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Hotkeys</span>
        </button>
      </div>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          disabled={!hasSelection}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 ${hasSelection
              ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm cursor-pointer active:scale-98'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            }`}
          title={hasSelection ? 'Save the selected rectangular region to SVG' : 'Draw a rectangle on the PDF first'}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save SVG Selection</span>
        </button>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
