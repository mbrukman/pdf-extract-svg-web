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
 * MuPDF WebAssembly loader and helper (PDF loading/rendering, SVG export).
 */
let mupdfPromise: Promise<typeof import('mupdf')> | null = null;

export async function getMuPdf(): Promise<typeof import('mupdf')> {
  if (!mupdfPromise) {
    mupdfPromise = import('mupdf');
  }
  return mupdfPromise;
}
