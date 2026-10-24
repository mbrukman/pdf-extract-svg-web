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
 * PDF Vector Extractor
 * Uses MuPDF WebAssembly for authentic underlying vector data extraction and high-speed page rendering.
 * Supports navigation, rectangular selection, and instant SVG download.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Document, Page } from 'mupdf';
import { getMuPdf } from './utils/mupdfHelper';
import type { AspectRatioOption, DocumentInfo, SelectionRect, ToolMode } from './types/pdf';

import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { PdfViewer } from './components/PdfViewer';
import { ThumbnailStrip } from './components/ThumbnailStrip';
import { SelectionInspector } from './components/SelectionInspector';
import { SvgExportModal } from './components/SvgExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { EmptyState } from './components/EmptyState';

export default function App() {
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentPageObj, setCurrentPageObj] = useState<Page | null>(null);

  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('free');
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [pageSize, setPageSize] = useState<{ widthPt: number; heightPt: number }>({ widthPt: 0, heightPt: 0 });

  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Load a PDF document from bytes using MuPDF WebAssembly
  const loadPdfBytes = useCallback(async (data: Uint8Array | ArrayBuffer, filename: string, filesize: number) => {
    try {
      setIsLoadingDoc(true);
      setErrorToast(null);

      const mupdf = await getMuPdf();
      const rawPdfBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

      const doc: Document = mupdf.Document.openDocument(rawPdfBytes, 'application/pdf');
      const numPages = doc.countPages();

      setDocInfo({
        filename,
        filesize,
        numPages,
        doc,
        rawPdfBytes,
      });

      setCurrentPage(1);
      setSelection(null);
      setRotation(0);
    } catch (err: unknown) {
      console.error('Failed to load PDF with MuPDF:', err);
      setErrorToast(err instanceof Error ? err.message : 'Failed to load PDF document');
    } finally {
      setIsLoadingDoc(false);
    }
  }, []);

  // Handle user uploaded file
  const handleUploadFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await loadPdfBytes(buffer, file.name, file.size);
    } catch (err: unknown) {
      setErrorToast(err instanceof Error ? err.message : 'Failed to read uploaded file');
    }
  }, [loadPdfBytes]);


  // Fetch page proxy when docInfo or currentPage changes
  useEffect(() => {
    if (!docInfo?.doc) return;

    let isCancelled = false;

    const fetchPage = () => {
      try {
        setIsLoadingPage(true);
        // MuPDF is 0-indexed
        const page = docInfo.doc.loadPage(currentPage - 1);
        if (!isCancelled) {
          setCurrentPageObj(page);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Error fetching page from MuPDF:', err);
          setErrorToast(err instanceof Error ? err.message : 'Error retrieving page');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPage(false);
        }
      }
    };

    fetchPage();

    return () => {
      isCancelled = true;
    };
  }, [docInfo, currentPage]);

  // Page navigation handlers
  const handlePageChange = useCallback((newPage: number) => {
    if (!docInfo || newPage < 1 || newPage > docInfo.numPages) return;
    setCurrentPage(newPage);
    setSelection(null);
  }, [docInfo]);

  // Fit width calculation
  const handleFitWidth = useCallback(() => {
    if (pageSize.widthPt > 0) {
      const availableWidth = window.innerWidth - (showSidebar ? 420 : 80);
      const targetScale = Math.max(0.4, Math.min(2.5, availableWidth / pageSize.widthPt));
      setScale(Math.round(targetScale * 100) / 100);
    }
  }, [pageSize, showSidebar]);

  // Fit page calculation
  const handleFitPage = useCallback(() => {
    if (pageSize.heightPt > 0) {
      const availableHeight = window.innerHeight - 180;
      const targetScale = Math.max(0.3, Math.min(2.0, availableHeight / pageSize.heightPt));
      setScale(Math.round(targetScale * 100) / 100);
    }
  }, [pageSize]);

  // Rotation handler
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
    setSelection(null);
  }, []);


  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === '[') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ']') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((prev) => Math.min(3.5, Math.round((prev + 0.15) * 100) / 100));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScale((prev) => Math.max(0.25, Math.round((prev - 0.15) * 100) / 100));
      } else if (e.key === '0') {
        e.preventDefault();
        setScale(1.0);
      } else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleRotate();
      } else if (e.key === 'Escape') {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (selection) {
          setSelection(null);
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (selection && selection.width > 0 && selection.height > 0) {
          setIsExportModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, handlePageChange, handleRotate, isExportModalOpen, isShortcutsOpen, selection]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 text-neutral-900 font-sans">
      <Header
        filename={docInfo?.filename}
        hasSelection={Boolean(selection && selection.width > 0 && selection.height > 0)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        currentPage={currentPage}
        totalPages={docInfo?.numPages || 1}
      />

      {/* Main Workspace Toolbar */}
      {docInfo ? (
        <>
          <Toolbar
            currentPage={currentPage}
            totalPages={docInfo.numPages}
            onPageChange={handlePageChange}
            scale={scale}
            onScaleChange={setScale}
            onFitWidth={handleFitWidth}
            onFitPage={handleFitPage}
            rotation={rotation}
            onRotate={handleRotate}
            toolMode={toolMode}
            onToolModeChange={setToolMode}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            hasSelection={Boolean(selection && selection.width > 0 && selection.height > 0)}
            onClearSelection={handleClearSelection}
            onUploadFile={handleUploadFile}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            isLoading={isLoadingDoc}
          />

          {/* Canvas & Sidebar Workspace Area */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left Thumbnails Strip */}
            {showSidebar && (
              <ThumbnailStrip
                doc={docInfo.doc}
                currentPage={currentPage}
                onSelectPage={handlePageChange}
                totalPages={docInfo.numPages}
              />
            )}

            {/* Central Interactive MuPDF Viewer */}
            <PdfViewer
              page={currentPageObj}
              scale={scale}
              rotation={rotation}
              toolMode={toolMode}
              selection={selection}
              onSelectionChange={setSelection}
              aspectRatio={aspectRatio}
              onSaveSelection={() => setIsExportModalOpen(true)}
              isLoadingPage={isLoadingPage}
              onDimensionsLoaded={setPageSize}
            />

            {/* Right Selection Inspector */}
            {showSidebar && (
              <SelectionInspector
                selection={selection}
                onSelectionChange={setSelection}
                pageSize={pageSize}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                onSaveSelection={() => setIsExportModalOpen(true)}
              />
            )}
          </div>
        </>
      ) : (
        <EmptyState
          onUploadFile={handleUploadFile}
          isLoading={isLoadingDoc}
        />
      )}

      {/* Pure Vector SVG Export Modal */}
      <SvgExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        rawPdfBytes={docInfo?.rawPdfBytes || null}
        pageNumber={currentPage}
        rotation={rotation}
        selection={selection}
        baseFilename={docInfo?.filename || 'document'}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Error Toast */}
      {errorToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-150">
          <span>{errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            className="text-rose-300 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
