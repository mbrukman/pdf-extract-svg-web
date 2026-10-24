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
import { getMuPdf } from './mupdfHelper';

describe('MuPDF Helper Module', () => {
  it('loads the MuPDF WebAssembly module successfully', async () => {
    const mupdf = await getMuPdf();
    expect(mupdf).toBeDefined();
    expect(typeof mupdf.Document.openDocument).toBe('function');
    expect(mupdf.Matrix).toBeDefined();
    expect(mupdf.ColorSpace).toBeDefined();
    expect(mupdf.Buffer).toBeDefined();
  });

  it('returns the exact same singleton instance on sequential calls', async () => {
    const instance1 = await getMuPdf();
    const instance2 = await getMuPdf();
    expect(instance1).toBe(instance2);
  });
});
