import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";

export function Spinner({ size = 18, className: cls }: LooseProps) {
	return (
		<span className={cn("wg-kit-spinner", cls)} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<circle cx={12} cy={12} r={9} />
			</svg>
		</span>
	);
}
