import { createElement as h } from "react";
import type { ReactElement } from "react";
import { wornWord } from "../utils/surface";
import type { WordChoice } from "../utils/surface";
import { BlockSkeleton } from "./block-skeleton";
import { ButtonSkeleton } from "./button-skeleton";
import { CardSkeleton } from "./card-skeleton";
import { ChartSkeleton } from "./chart-skeleton";
import { EmblemSkeleton } from "./emblem-skeleton";
import { FieldSkeleton } from "./field-skeleton";
import { RowSkeleton } from "./row-skeleton";
import type { SkeletonPartProps } from "./skeleton-bone";
import { SparklineSkeleton } from "./sparkline-skeleton";
import { TextSkeleton } from "./text-skeleton";

export type { SkeletonPartProps } from "./skeleton-bone";

export type SkeletonKind = "block" | "text" | "emblem" | "button" | "field" | "row" | "sparkline" | "chart" | "card";

export interface SkeletonProps extends SkeletonPartProps {
	readonly kind?: SkeletonKind | undefined;
}

type SkeletonPreset = (props: SkeletonPartProps) => ReactElement;

const SKELETON_PRESETS: Readonly<Record<SkeletonKind, SkeletonPreset>> = {
	block: BlockSkeleton,
	text: TextSkeleton,
	emblem: EmblemSkeleton,
	button: ButtonSkeleton,
	field: FieldSkeleton,
	row: RowSkeleton,
	sparkline: SparklineSkeleton,
	chart: ChartSkeleton,
	card: CardSkeleton,
};

const SKELETON_KIND_WORD: WordChoice<SkeletonKind> = {
	kind: "skeleton kind",
	allowed: ["block", "text", "emblem", "button", "field", "row", "sparkline", "chart", "card"],
	fallback: "block",
};

export function Skeleton({ kind, ...props }: SkeletonProps): ReactElement {
	const Drawn = SKELETON_PRESETS[wornWord(kind, SKELETON_KIND_WORD)];
	return <Drawn {...props} />;
}
