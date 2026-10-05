import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TokenStyle } from "../utils/token-style";
import { cn } from "../utils/cn";

export interface PhotoStackProps {
	readonly photos?: readonly string[] | undefined;
	readonly size?: number | undefined;
	readonly isRound?: boolean | undefined;
	readonly className?: string | undefined;
}

export function PhotoStack({ photos = [], size = 56, isRound = false, className: cls }: PhotoStackProps): ReactElement {
	return (
		<span className={cn("wg-kit-photo-stack", isRound && "is-round", cls)} style={sizedOf(size)}>
			{photos.map((photo, index) => (
				<img key={`${index}-${photo}`} src={photo} alt="" />
			))}
		</span>
	);
}

function sizedOf(size: number): TokenStyle {
	return { "--wg-photo-size": `${size}px` };
}
