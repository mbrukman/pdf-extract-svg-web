# PDF extract SVG web

This app lets you extract a region from a PDF to SVG, interactively, in the browser.

> [!NOTE]
> If the source PDF contains rasterized content (i.e. not vector), the extracted
> SVG will contain that rasterized content as-is. This app does not auto-vectorize
> raster data.

## Running locally

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
