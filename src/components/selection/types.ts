import type { CanvasInfo, NormieTraits, PixelString } from "@/api/types";

/** All data loaded for a previewed Normie before confirming selection. */
export interface PreviewData {
  id: number;
  traits: NormieTraits;
  canvas: CanvasInfo;
  pixels: PixelString;
  /** Raw SVG markup from /normie/{id}/image.svg — used as data URL in <img>. */
  svgMarkup: string;
}
