import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ART_SIZE_PX, CAPSULES_AT_MOST } from "../constants/art";
import type { ArtShape } from "../constants/art";
import type { BadgeColor } from "../constants/tones";
import { artInksOf, toneOfIndex } from "../utils/art";
import { cn } from "../utils/cn";
import type { TokenStyle } from "../utils/token-style";

export interface ArtObjectProps {
	readonly shape: ArtShape;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly size?: number | undefined;
	readonly count?: number | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function ArtObject({
	shape,
	tones,
	size = ART_SIZE_PX,
	count = 3,
	children,
	className: cls,
}: ArtObjectProps): ReactElement {
	return (
		<span className={cn("wg-kit-art", `is-${shape}`, cls)} style={artInksOf(tones, size)} aria-hidden="true">
			{partsOf(shape, tones, count)}
			{shape === "coin" ? <b>{children}</b> : null}
		</span>
	);
}

function partsOf(shape: ArtShape, tones: readonly BadgeColor[] | undefined, count: number): ReactNode {
	if (shape === "discs" || shape === "blocks") return discsOf(tones, Math.min(count, 4));
	if (shape !== "capsules") return null;
	return Array.from({ length: Math.min(count, CAPSULES_AT_MOST) }, (_, index) => (
		<i key={index} style={{ background: `var(--wg-kit-${tones?.[index % tones.length] ?? toneOfIndex(index)})` }} />
	));
}

function discsOf(tones: readonly BadgeColor[] | undefined, count: number): ReactNode {
	return Array.from({ length: count }, (_, index) => {
		const tone = tones?.[index] ?? toneOfIndex(index * 2);
		const inked: TokenStyle = { "--wg-art-a": `var(--wg-kit-${tone})`, "--wg-art-place": index };
		return <i key={index} style={inked} />;
	});
}
