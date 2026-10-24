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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Page } from 'mupdf';
import { RefreshCw } from 'lucide-react';
import type { AspectRatioOption, SelectionRect, ToolMode } from '../types/pdf';
import { getMuPdf } from '../utils/mupdfHelper';
import { constrainRatio } from '../utils/geometry';

interface PdfViewerProps {
  page: Page | null;
  scale: number;
  rotation: number;
  toolMode: ToolMode;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
  aspectRatio: AspectRatioOption;
  onSaveSelection?: () => void;
  isLoadingPage: boolean;
  onDimensionsLoaded: (dims: { widthPt: number; heightPt: number }) => void;
}

interface DragState {
  type: 'create' | 'move' | 'resize';
  handle?: string;
  startX: number;
  startY: number;
  initialRect: SelectionRect;
  overlayLeft: number;
  overlayTop: number;
}

const PdfViewerComponent: React.FC<PdfViewerProps> = ({
  page,
  scale,
  rotation,
  toolMode,
  selection,
  onSelectionChange,
  aspectRatio,
  isLoadingPage,
  onDimensionsLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState<{ widthPt: number; heightPt: number }>({ widthPt: 0, heightPt: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Pan support
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [panState, setPanState] = useState<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Zero-latency native dragging references
  const isDraggingRef = useRef<boolean>(false);
  const dragStateRef = useRef<DragState | null>(null);
  const currentRectRef = useRef<SelectionRect>({ x: 0, y: 0, width: 0, height: 0 });
  const rafIdRef = useRef<number | null>(null);
  const lastStateNotifyTimeRef = useRef<number>(0);

  // Synchronize selection box DOM styles when NOT actively dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    const box = selectionBoxRef.current;
    if (!box) return;

    if (selection && selection.width > 0 && selection.height > 0) {
      currentRectRef.current = { ...selection };
      box.style.display = 'block';
      box.style.left = `${selection.x * scale}px`;
      box.style.top = `${selection.y * scale}px`;
      box.style.width = `${selection.width * scale}px`;
      box.style.height = `${selection.height * scale}px`;
    } else {
      currentRectRef.current = { x: 0, y: 0, width: 0, height: 0 };
      box.style.display = 'none';
    }
  }, [selection, scale]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Keep zoom centered on the current viewport focal point when scaling
  const prevScaleRef = useRef(scale);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (prevScaleRef.current !== scale && prevScaleRef.current > 0) {
      const ratio = scale / prevScaleRef.current;
      const currentCenterX = container.scrollLeft + container.clientWidth / 2;
      const currentCenterY = container.scrollTop + container.clientHeight / 2;

      const newCenterX = currentCenterX * ratio;
      const newCenterY = currentCenterY * ratio;

      container.scrollLeft = Math.max(0, newCenterX - container.clientWidth / 2);
      container.scrollTop = Math.max(0, newCenterY - container.clientHeight / 2);
    }
    prevScaleRef.current = scale;
  }, [scale]);

  // Keyboard space listener for quick pan toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setPanState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Render PDF Page to Canvas using MuPDF
  useEffect(() => {
    if (!page || !canvasRef.current) return;

    let isCancelled = false;

    const render = async () => {
      try {
        setIsRendering(true);
        setRenderError(null);

        const mupdf = await getMuPdf();
        if (isCancelled) return;

        const bounds = page.getBounds();
        const baseWidthPt = bounds[2] - bounds[0];
        const baseHeightPt = bounds[3] - bounds[1];

        const isRotated90 = rotation === 90 || rotation === 270;
        const widthPt = isRotated90 ? baseHeightPt : baseWidthPt;
        const heightPt = isRotated90 ? baseWidthPt : baseHeightPt;

        setPageSize({ widthPt, heightPt });
        onDimensionsLoaded({ widthPt, heightPt });

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Retina / high DPI multiplier
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const actualScale = scale * dpr;

        // Compute rotation & scale matrix
        let matrix = mupdf.Matrix.identity;
        if (rotation === 90) {
          matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(90), mupdf.Matrix.translate(baseHeightPt, 0));
        } else if (rotation === 180) {
          matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(180), mupdf.Matrix.translate(baseWidthPt, baseHeightPt));
        } else if (rotation === 270) {
          matrix = mupdf.Matrix.concat(mupdf.Matrix.rotate(270), mupdf.Matrix.translate(0, baseWidthPt));
        }
        matrix = mupdf.Matrix.concat(matrix, mupdf.Matrix.scale(actualScale, actualScale));

        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true);
        const pixW = pixmap.getWidth();
        const pixH = pixmap.getHeight();

        canvas.width = pixW;
        canvas.height = pixH;
        canvas.style.width = `${Math.round(widthPt * scale)}px`;
        canvas.style.height = `${Math.round(heightPt * scale)}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pixels = pixmap.getPixels();
          const imgData = ctx.createImageData(pixW, pixH);
          imgData.data.set(pixels);
          ctx.putImageData(imgData, 0, 0);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('MuPDF Render Error:', err);
          setRenderError(err instanceof Error ? err.message : 'Render failed');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [page, scale, rotation, onDimensionsLoaded]);


  // Compute selection rect from native pointer coordinates (zero DOM queries)
  const computeRect = useCallback((drag: DragState, clientX: number, clientY: number): SelectionRect => {
    const relX = clientX - drag.overlayLeft;
    const relY = clientY - drag.overlayTop;

    const currentX = Math.max(0, Math.min(pageSize.widthPt, relX / scale));
    const currentY = Math.max(0, Math.min(pageSize.heightPt, relY / scale));

    if (drag.type === 'create') {
      const rawW = currentX - drag.startX;
      const rawH = currentY - drag.startY;

      const signX = rawW >= 0 ? 1 : -1;
      const signY = rawH >= 0 ? 1 : -1;

      const constrained = constrainRatio(Math.abs(rawW), Math.abs(rawH), aspectRatio);
      const w = constrained.width * signX;
      const h = constrained.height * signY;

      const x = w >= 0 ? drag.startX : drag.startX + w;
      const y = h >= 0 ? drag.startY : drag.startY + h;
      const finalW = Math.abs(w);
      const finalH = Math.abs(h);

      const clampedX = Math.max(0, Math.min(x, pageSize.widthPt));
      const clampedY = Math.max(0, Math.min(y, pageSize.heightPt));
      const clampedW = Math.min(finalW, pageSize.widthPt - clampedX);
      const clampedH = Math.min(finalH, pageSize.heightPt - clampedY);

      return { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
    } else if (drag.type === 'move') {
      const dx = currentX - drag.startX;
      const dy = currentY - drag.startY;

      let newX = drag.initialRect.x + dx;
      let newY = drag.initialRect.y + dy;

      newX = Math.max(0, Math.min(newX, pageSize.widthPt - drag.initialRect.width));
      newY = Math.max(0, Math.min(newY, pageSize.heightPt - drag.initialRect.height));

      return {
        x: newX,
        y: newY,
        width: drag.initialRect.width,
        height: drag.initialRect.height,
      };
    } else if (drag.type === 'resize' && drag.handle) {
      const dx = currentX - drag.startX;
      const dy = currentY - drag.startY;

      let x = drag.initialRect.x;
      let y = drag.initialRect.y;
      let w = drag.initialRect.width;
      let h = drag.initialRect.height;

      if (drag.handle.includes('e')) {
        w = Math.max(10, drag.initialRect.width + dx);
      }
      if (drag.handle.includes('s')) {
        h = Math.max(10, drag.initialRect.height + dy);
      }
      if (drag.handle.includes('w')) {
        const potentialW = drag.initialRect.width - dx;
        if (potentialW >= 10) {
          x = drag.initialRect.x + dx;
          w = potentialW;
        }
      }
      if (drag.handle.includes('n')) {
        const potentialH = drag.initialRect.height - dy;
        if (potentialH >= 10) {
          y = drag.initialRect.y + dy;
          h = potentialH;
        }
      }

      x = Math.max(0, Math.min(x, pageSize.widthPt));
      y = Math.max(0, Math.min(y, pageSize.heightPt));
      w = Math.min(w, pageSize.widthPt - x);
      h = Math.min(h, pageSize.heightPt - y);

      return { x, y, width: w, height: h };
    }

    return { x: 0, y: 0, width: 0, height: 0 };
  }, [pageSize, scale, aspectRatio]);

  // Start native drag session with hardware-rate window listeners
  const startDragSession = useCallback((action: DragState) => {
    isDraggingRef.current = true;
    dragStateRef.current = action;

    const box = selectionBoxRef.current;
    if (box) {
      box.style.display = 'block';
      box.style.left = `${action.initialRect.x * scale}px`;
      box.style.top = `${action.initialRect.y * scale}px`;
      box.style.width = `${action.initialRect.width * scale}px`;
      box.style.height = `${action.initialRect.height * scale}px`;
    }

    const onNativePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const newRect = computeRect(drag, e.clientX, e.clientY);
      currentRectRef.current = newRect;

      // Update DOM styles directly with zero React overhead
      if (box) {
        box.style.left = `${newRect.x * scale}px`;
        box.style.top = `${newRect.y * scale}px`;
        box.style.width = `${newRect.width * scale}px`;
        box.style.height = `${newRect.height * scale}px`;
      }

      // Smoothly throttle React state update to avoid locking the UI thread
      const now = performance.now();
      if (now - lastStateNotifyTimeRef.current > 60) {
        lastStateNotifyTimeRef.current = now;
        onSelectionChange(newRect);
      }
    };

    const onNativePointerUp = () => {
      window.removeEventListener('pointermove', onNativePointerMove);
      window.removeEventListener('pointerup', onNativePointerUp);

      isDraggingRef.current = false;
      const finalRect = currentRectRef.current;
      const drag = dragStateRef.current;
      dragStateRef.current = null;

      if (drag?.type === 'create' && (finalRect.width < 5 || finalRect.height < 5)) {
        if (box) box.style.display = 'none';
        onSelectionChange(null);
      } else {
        onSelectionChange(finalRect);
      }
    };

    window.addEventListener('pointermove', onNativePointerMove, { passive: true });
    window.addEventListener('pointerup', onNativePointerUp, { once: true });
  }, [scale, computeRect, onSelectionChange]);

  // Pointer Down on Page (Create new selection or pan)
  const handleOverlayPointerDown = (e: React.PointerEvent) => {
    if (isSpacePressed || toolMode === 'pan') {
      if (!containerRef.current) return;
      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return; // Left click only

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = Math.max(0, Math.min(pageSize.widthPt, (e.clientX - rect.left) / scale));
    const startY = Math.max(0, Math.min(pageSize.heightPt, (e.clientY - rect.top) / scale));

    const initialRect = { x: startX, y: startY, width: 0, height: 0 };
    currentRectRef.current = initialRect;

    startDragSession({
      type: 'create',
      startX,
      startY,
      initialRect,
      overlayLeft: rect.left,
      overlayTop: rect.top,
    });
  };

  // Pointer Down inside Selection Box (Move)
  const handleSelectionBoxPointerDown = (e: React.PointerEvent) => {
    if (toolMode === 'pan' || isSpacePressed) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = Math.max(0, Math.min(pageSize.widthPt, (e.clientX - rect.left) / scale));
    const startY = Math.max(0, Math.min(pageSize.heightPt, (e.clientY - rect.top) / scale));

    const baseRect = selection || currentRectRef.current;

    startDragSession({
      type: 'move',
      startX,
      startY,
      initialRect: { ...baseRect },
      overlayLeft: rect.left,
      overlayTop: rect.top,
    });
  };

  // Pointer Down on Resize Handle (Resize)
  const handleResizeHandlePointerDown = (e: React.PointerEvent, handle: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = Math.max(0, Math.min(pageSize.widthPt, (e.clientX - rect.left) / scale));
    const startY = Math.max(0, Math.min(pageSize.heightPt, (e.clientY - rect.top) / scale));

    const baseRect = selection || currentRectRef.current;

    startDragSession({
      type: 'resize',
      handle,
      startX,
      startY,
      initialRect: { ...baseRect },
      overlayLeft: rect.left,
      overlayTop: rect.top,
    });
  };

  // Pan Move Listener
  const handleContainerPointerMove = (e: React.PointerEvent) => {
    if (panState && containerRef.current) {
      const dx = e.clientX - panState.startX;
      const dy = e.clientY - panState.startY;
      containerRef.current.scrollLeft = panState.scrollLeft - dx;
      containerRef.current.scrollTop = panState.scrollTop - dy;
    }
  };

  const handleContainerPointerUp = () => {
    setPanState(null);
  };

  const isPanningCursor = isSpacePressed || toolMode === 'pan';

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 h-full overflow-auto bg-neutral-200/70 select-none ${isPanningCursor ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >
      <div className="min-w-full min-h-full flex p-8 sm:p-12 w-max h-max">
        {/* Main Page Canvas Container */}
        <div
          className="m-auto relative bg-white shadow-xl transition-shadow duration-200 shrink-0"
          style={{
            width: pageSize.widthPt ? `${Math.round(pageSize.widthPt * scale)}px` : 'auto',
            height: pageSize.heightPt ? `${Math.round(pageSize.heightPt * scale)}px` : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: pageSize.widthPt ? `${Math.round(pageSize.widthPt * scale)}px` : 'auto',
              height: pageSize.heightPt ? `${Math.round(pageSize.heightPt * scale)}px` : 'auto',
            }}
          />

          {/* Loading Overlay */}
          {(isLoadingPage || isRendering) && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 z-20">
              <RefreshCw className="w-6 h-6 text-neutral-800 animate-spin" />
              <span className="text-xs font-medium text-neutral-600">Rendering page with MuPDF...</span>
            </div>
          )}

          {/* Render Error */}
          {renderError && (
            <div className="absolute inset-0 bg-rose-50/90 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="text-xs font-semibold text-rose-800 mb-1">Failed to render page</div>
              <div className="text-2xs text-rose-600 max-w-sm">{renderError}</div>
            </div>
          )}

          {/* Interactive Selection Overlay */}
          <div
            ref={overlayRef}
            onPointerDown={handleOverlayPointerDown}
            className="absolute inset-0 z-10 touch-none"
          >
            {/* Active Selection Box (Direct DOM Mutated with contain: layout paint) */}
            <div
              ref={selectionBoxRef}
              onPointerDown={handleSelectionBoxPointerDown}
              className="absolute border-2 border-indigo-600 bg-indigo-500/15 group shadow-sm cursor-move touch-none"
              style={{
                display: selection && selection.width > 0 && selection.height > 0 ? 'block' : 'none',
                left: `${(selection?.x || 0) * scale}px`,
                top: `${(selection?.y || 0) * scale}px`,
                width: `${(selection?.width || 0) * scale}px`,
                height: `${(selection?.height || 0) * scale}px`,
                contain: 'layout paint',
                willChange: 'left, top, width, height',
              }}
            >
              {/* Outer Dashed Border */}
              <div className="absolute inset-0 border border-dashed border-white/80 pointer-events-none" />

              {/* 8 Resize Handles */}
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'nw')}
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-nwse-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'n')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-ns-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'ne')}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'e')}
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-ew-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'se')}
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-nwse-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 's')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-ns-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'sw')}
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handleResizeHandlePointerDown(e, 'w')}
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs shadow-xs cursor-ew-resize hover:scale-125 transition-transform"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PdfViewer = React.memo(PdfViewerComponent);
