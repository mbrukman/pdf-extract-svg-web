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

import type { Document, Page } from 'mupdf';

export interface SelectionRect {
  x: number; // in PDF points
  y: number;
  width: number;
  height: number;
}

export type AspectRatioOption = 'free' | '1:1' | '4:3' | '16:9' | '3:2' | '1.618';

export interface DocumentInfo {
  filename: string;
  filesize: number; // in bytes
  numPages: number;
  doc: Document;
  rawPdfBytes: Uint8Array;
}

export interface PageMetrics {
  widthPt: number;
  heightPt: number;
  rotation: number;
  scale: number;
}

export type ToolMode = 'select' | 'pan';
export type MuPdfPage = Page;
