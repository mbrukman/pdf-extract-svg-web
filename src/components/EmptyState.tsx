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
import { Upload } from 'lucide-react';

interface EmptyStateProps {
  onUploadFile: (file: File) => void;
  isLoading: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUploadFile,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onUploadFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto bg-neutral-100 select-none">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Intro Hero */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Extract a region from PDF as SVG
          </h1>
          <p className="text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
            Open a PDF document, inspect pages, draw a rectangular crop region, and download the selection as a scalable vector graphic.
          </p>
          <p className="text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
            <b>Your documents stay private: all processing is local in your browser.</b>
          </p>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-14 transition-all cursor-pointer bg-white ${isDragging
            ? 'border-indigo-600 bg-indigo-50/40 ring-4 ring-indigo-100 scale-102'
            : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50/50 shadow-sm'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md">
              <Upload className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-neutral-900">
                Click to browse or drop your PDF here
              </p>
              <p className="text-xs text-neutral-500">
                Supports all standard PDF documents, diagrams, blueprints, and papers
              </p>
            </div>

            <button
              type="button"
              className="mt-2 px-5 py-2.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-2xs pointer-events-none"
            >
              Open PDF file
            </button>
          </div>
        </div>


      </div>
    </div>
  );
};
