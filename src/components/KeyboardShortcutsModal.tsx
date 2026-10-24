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
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '← / →', desc: 'Previous or Next Page' },
    { key: 'PageUp / PageDn', desc: 'Jump forward / backward one page' },
    { key: '+ / -', desc: 'Zoom In or Zoom Out' },
    { key: '0', desc: 'Reset Zoom to 100%' },
    { key: 'Space + Drag', desc: 'Pan around the page smoothly' },
    { key: 'R', desc: 'Rotate page clockwise 90 degrees' },
    { key: 'Cmd/Ctrl + S', desc: 'Save current selection to SVG' },
    { key: 'Esc', desc: 'Deselect / Clear selection box' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-md w-full overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-semibold text-neutral-900">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 text-xs">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
              <span className="text-neutral-600">{sc.desc}</span>
              <kbd className="px-2 py-1 bg-neutral-100 border border-neutral-300 rounded font-mono text-2xs font-semibold text-neutral-800 shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
