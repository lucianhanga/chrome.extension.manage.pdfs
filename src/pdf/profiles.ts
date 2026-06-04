// Export profile parameter tables (Phase 4 implementation).

export interface ExportProfileParams {
  /** Target DPI cap for rasterized images. */
  targetDpi: number;
  /** JPEG quality factor [0–1]. */
  jpegQuality: number;
  /** Use pdf-lib object streams for structural compression. */
  useObjectStreams: boolean;
  /**
   * When true, rasterize copied PDF pages through pdf.js -> JPEG -> embed.
   * Reduces size but converts vector text to raster — user must be warned.
   */
  rasterizePdfPages: boolean;
}

export const PRINT_PROFILE: ExportProfileParams = {
  targetDpi: 300,
  jpegQuality: 0.92,
  useObjectStreams: true,
  rasterizePdfPages: false,
};

export const WEB_PROFILE: ExportProfileParams = {
  targetDpi: 150,
  jpegQuality: 0.8,
  useObjectStreams: true,
  rasterizePdfPages: false,
};

export const COMPRESSED_PROFILE: ExportProfileParams = {
  targetDpi: 96,
  jpegQuality: 0.6,
  useObjectStreams: true,
  rasterizePdfPages: true,
};
