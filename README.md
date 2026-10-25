# PDF extract SVG web

[![pdf-extract-svg-web-badge]][pdf-extract-svg-web-url]

[pdf-extract-svg-web-badge]: https://github.com/mbrukman/pdf-extract-svg-web/actions/workflows/ci-cd.yaml/badge.svg?branch=main
[pdf-extract-svg-web-url]: https://github.com/mbrukman/pdf-extract-svg-web/actions/workflows/ci-cd.yaml?query=branch%3Amain

This app lets you extract a region from a PDF to SVG, interactively, in the browser.

> [!NOTE]
> If the source PDF contains rasterized content (i.e. not vector), the extracted
> SVG will contain that rasterized content as-is. This app does not auto-vectorize
> raster data.

## Live app

Visit **https://mbrukman.github.io/pdf-extract-svg-web/** to use the app quickly
and easily without downloading, building, or deploying code anywhere.

All processing happens client-side in your browser, so your PDFs never leave
your computer.

## Build and run locally

1. Install [Bun](https://bun.sh/)
2. Run `bun install` to install dependencies
3. Run `bun run dev` to start the development server
4. Open the printed URL in your browser to view the app
5. Drag a PDF file onto the "Drop PDF here" area to open it, or click the
   button to use a file dialog to open our PDF
6. Select a region using the mouse and then click "Extract selected region" to
   generate and download SVG

## License

This project is licensed under AGPL-3.0-only, due to the dependency on
[MuPDF](https://github.com/ArtifexSoftware/mupdf) for PDF parsing, rendering, and SVG output.

See [LICENSE](LICENSE) for details.
