import { createElement as h, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { cn } from "../utils/cn";
import { pickedBySeed } from "../utils/marks";
import type { TokenStyle } from "../utils/token-style";
import { SHAPE_NAMES, SHAPE_NAME_STREAM, SHAPE_SIZE_PX, SHAPE_TONE_STREAM, SHAPE_TONES } from "./shape-names";
import type { ShapeLook, ShapeName } from "./shape-names";
import { SHAPE_POINTS, SHAPE_VIEW_BOX } from "./shape-table";
import { useMorphedOutline } from "./use-morphed-outline";
import { ShapeLight } from "./shape-light";

export interface ShapeProps {
	readonly name?: ShapeName | undefined;
	readonly seed?: unknown;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly look?: ShapeLook | undefined;
	readonly size?: number | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function Shape({
	name,
	seed,
	tones,
	look = "3d",
	size = SHAPE_SIZE_PX,
	children,
	className: cls,
}: ShapeProps): ReactElement {
	const id = useId();
	const { outline, light } = useMorphedOutline(
		SHAPE_POINTS[name ?? pickedBySeed(SHAPE_NAMES, seed, SHAPE_NAME_STREAM, "circle")],
	);
	const body = tones?.[0] ?? pickedBySeed(SHAPE_TONES, seed, SHAPE_TONE_STREAM, "purple");
	const inked: TokenStyle = {
		"--wg-shape-a": `var(--wg-kit-${body})`,
		"--wg-shape-b": `var(--wg-kit-${tones?.[1] ?? body})`,
		"--wg-shape-size": `${size}px`,
	};
	const isLit = look === "3d";
	return (
		<span className={cn("wg-kit-shape", `is-${look}`, cls)} style={inked} aria-hidden="true">
			<svg viewBox={SHAPE_VIEW_BOX} focusable="false">
				{isLit ? <ShapeLight id={id} light={light} /> : null}
				<path d={outline} fill={isLit ? `url(#${id}-body)` : "var(--wg-shape-a)"} />
				{isLit ? <path d={outline} fill={`url(#${id}-bounce)`} /> : null}
				{isLit ? <path d={outline} fill={`url(#${id}-shine)`} /> : null}
			</svg>
			{children ? <b className="wg-kit-shape-mark">{children}</b> : null}
		</span>
	);
}
