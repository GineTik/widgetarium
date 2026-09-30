export type TooltipIndicator = "dot" | "line" | "dashed";

export type SparklinePlace = "first" | "last" | "min" | "max";

export const CHART_COLOR_COUNT = 5;

export const CHART_INITIAL_SIZE = { width: 320, height: 180 };

export const TOOLTIP_INDICATORS: readonly TooltipIndicator[] = ["dot", "line", "dashed"];

export const SPARKLINE_HEIGHT = 32;
export const SPARKLINE_FALLBACK_WIDTH = 120;
export const SPARKLINE_INSET = 4;
export const SPARKLINE_DOT_RADIUS = 3;
export const SPARKLINE_BAR_SHARE = 0.7;
export const SPARKLINE_BAR_CORNER = 1.5;
export const SPARKLINE_BAR_FLOOR = 1.5;
export const SPARKLINE_DOT_PLACES: readonly SparklinePlace[] = ["first", "last", "min", "max"];
