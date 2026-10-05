import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CONFETTI_PIECES } from "../constants/art";
import type { BadgeColor } from "../constants/tones";
import { toneOfIndex } from "../utils/art";
import { cn } from "../utils/cn";

export interface ConfettiProps {
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly pieces?: number | undefined;
	readonly className?: string | undefined;
}

export function Confetti({ tones, pieces = CONFETTI_PIECES, className: cls }: ConfettiProps): ReactElement {
	return (
		<span className={cn("wg-kit-confetti", cls)} aria-hidden="true">
			{Array.from({ length: pieces }, (_, index) => (
				<i
					key={index}
					className={`is-${index % 3}`}
					style={{
						background: `var(--wg-kit-${tones?.[index % tones.length] ?? toneOfIndex(index)})`,
						left: `${(index * 37 + 8) % 92}%`,
						top: `${(index * 53 + 12) % 84}%`,
					}}
				/>
			))}
		</span>
	);
}
