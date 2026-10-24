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

import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  FileDown
} from 'lucide-react';
import type { SelectionRect } from '../types/pdf';
import {
  exportRegionToVectorSvg,
  downloadSvgFile,
  type ExportResult,
  type SvgExportOptions
} from '../utils/svgExporter';

interface SvgExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawPdfBytes: Uint8Array | null;
  pageNumber: number;
  rotation: number;
  selection: SelectionRect | null;
  baseFilename: string;
}

export const SvgExportModal: React.FC<SvgExportModalProps> = ({
  isOpen,
  onClose,
  rawPdfBytes,
  pageNumber,
  rotation,
  selection,
  baseFilename,
}) => {
  const [filename, setFilename] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default filename
  useEffect(() => {
    if (isOpen && selection) {
      const cleanBase = baseFilename.replace(/\.pdf$/i, '');
      const defaultName = `${cleanBase}_p${pageNumber}_${Math.round(selection.width)}x${Math.round(selection.height)}_vector`;
      setFilename(defaultName);
    }
  }, [isOpen, pageNumber, selection, baseFilename]);

  // Generate pure vector SVG preview (always default to transparent background)
  useEffect(() => {
    if (!isOpen || !rawPdfBytes || !selection) return;

    let isCancelled = false;

    const runExport = async () => {
      try {
        setIsExporting(true);
        setErrorMsg(null);

        const options: SvgExportOptions = {
          backgroundColor: 'transparent',
          includeSelectableText: false,
          filename: filename || 'crop_selection',
        };

        const result = await exportRegionToVectorSvg(
          rawPdfBytes,
          pageNumber - 1, // 0-indexed
          selection,
          rotation,
          options
        );

        if (!isCancelled) {
          setExportResult(result);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Vector export error:', err);
          setErrorMsg(err instanceof Error ? err.message : 'Failed to generate vector SVG');
        }
      } finally {
        if (!isCancelled) {
          setIsExporting(false);
        }
      }
    };

    runExport();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, rawPdfBytes, selection, pageNumber, rotation, filename]);

  if (!isOpen || !selection) return null;

  const handleDownload = () => {
    if (!exportResult) return;
    const finalName = filename.trim() ? filename.trim() : `crop_vector_p${pageNumber}`;
    downloadSvgFile(exportResult.blob, finalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-neutral-50/50">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span>Export selection to SVG</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Selection Preview */}
        <div className="flex-1 bg-neutral-100 p-6 overflow-auto flex items-center justify-center min-h-[260px] max-h-[460px]">
          {isExporting ? (
            <div className="flex flex-col items-center gap-2 text-neutral-500 text-xs">
              <div className="w-6 h-6 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin" />
              <span>Generating SVG...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs max-w-md text-center">
              <p className="font-semibold mb-1">Vector Generation Error</p>
              <p className="text-2xs">{errorMsg}</p>
            </div>
          ) : exportResult ? (
            <div className="bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)] bg-[length:12px_12px] bg-white shadow-md border border-neutral-300/80 rounded p-1 max-w-full max-h-[380px] overflow-auto">
              <img
                src={exportResult.dataUrl}
                alt="Exported vector SVG preview"
                className="max-h-[340px] w-auto object-contain mx-auto"
              />
            </div>
          ) : null}
        </div>

        {/* Filename Input Area (Below preview, above footer) */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-white shrink-0">
          <label className="block text-2xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            File Name
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-mono text-neutral-900 focus:outline-hidden focus:border-neutral-500 shadow-2xs"
              placeholder="vector_selection"
            />
            <span className="text-neutral-500 font-mono text-xs font-medium">.svg</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting || !exportResult}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-all shadow-sm active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
