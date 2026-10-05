import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { artInksOf } from "../utils/art";
import { cn } from "../utils/cn";

export interface ArtFieldProps {
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly isSoft?: boolean | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function ArtField({ tones, isSoft = false, children, className: cls }: ArtFieldProps): ReactElement {
	return (
		<div className={cn("wg-kit-art-field", isSoft && "is-soft", cls)} style={artInksOf(tones, 0)}>
			{children}
		</div>
	);
}
