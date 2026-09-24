import { createElement as h } from "react";
import { SPARKLINE_HEIGHT } from "../constants/charts";
import { EMBLEM_SHAPE_WORD, EMBLEM_SIZE_WORD, EMBLEM_SIZES } from "../constants/emblem";
import {
	SKELETON_BUTTON_SIZE_WORD,
	SKELETON_CARD_LINES,
	SKELETON_CHART_BARS,
	SKELETON_FIELD_SIZE_WORD,
	SKELETON_TEXT_LINES,
} from "../constants/skeleton";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { wornWord } from "../utils/surface";

export function Skeleton({ kind, ...props }: LooseProps) {
	const Drawn = SKELETON_PRESETS[wornWord(kind, SKELETON_KIND_WORD)];
	return <Drawn {...props} />;
}

function Bone({ className: cls, ...props }: LooseProps) {
	return <span {...domPropsOf(props)} className={cn("wg-kit-skeleton", cls)} aria-hidden="true" />;
}

function Group({ kind, className: cls, children, ...props }: LooseProps) {
	return (
		<span {...domPropsOf(props)} className={cn("wg-kit-skeleton-group", cls)} data-kind={kind} aria-hidden="true">
			{children}
		</span>
	);
}

function BlockSkeleton(props: LooseProps) {
	return <Bone {...props} data-kind="block" />;
}

function TextSkeleton({ lines = SKELETON_TEXT_LINES, ...props }: LooseProps) {
	return (
		<Group {...props} kind="text">
			{Array.from({ length: lines }, (_, at) => (
				<Bone key={at} data-part="line" data-last={at > 0 && at === lines - 1 ? "" : undefined} />
			))}
		</Group>
	);
}

function EmblemSkeleton({ size, shape, style, ...props }: LooseProps) {
	const px = typeof size === "number" ? size : EMBLEM_SIZES[wornWord(size, EMBLEM_SIZE_WORD)];
	return (
		<Bone
			{...props}
			data-kind="emblem"
			data-shape={wornWord(shape, EMBLEM_SHAPE_WORD)}
			style={{ "--wg-kit-skeleton-size": `${px}px`, ...style }}
		/>
	);
}

function ButtonSkeleton({ size, block = false, ...props }: LooseProps) {
	return (
		<Bone
			{...props}
			data-kind="button"
			data-size={wornWord(size, SKELETON_BUTTON_SIZE_WORD)}
			data-block={block ? "" : undefined}
		/>
	);
}

function FieldSkeleton({ size, ...props }: LooseProps) {
	return <Bone {...props} data-kind="field" data-size={wornWord(size, SKELETON_FIELD_SIZE_WORD)} />;
}

function RowSkeleton(props: LooseProps) {
	return (
		<Group {...props} kind="row">
			<Bone data-part="badge" />
			<TextSkeleton lines={2} />
		</Group>
	);
}

function SparklineSkeleton({ height = SPARKLINE_HEIGHT, style, ...props }: LooseProps) {
	return <Bone {...props} data-kind="sparkline" style={{ height: `${height}px`, ...style }} />;
}

function ChartSkeleton(props: LooseProps) {
	return (
		<Group {...props} kind="chart">
			{SKELETON_CHART_BARS.map((share, at) => (
				<Bone key={at} data-part="bar" style={{ height: `${share}%` }} />
			))}
		</Group>
	);
}

function CardSkeleton(props: LooseProps) {
	return (
		<Group {...props} kind="card">
			<Bone data-part="media" />
			<TextSkeleton lines={SKELETON_CARD_LINES} />
		</Group>
	);
}

const SKELETON_PRESETS = {
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

const SKELETON_KINDS = Object.keys(SKELETON_PRESETS);

const SKELETON_KIND_WORD = { kind: "skeleton kind", allowed: SKELETON_KINDS, fallback: SKELETON_KINDS[0] };
