import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";

export interface SpinnerProps {
	readonly size?: number;
	readonly className?: string | undefined;
}

const SPINNER_PX = 18;

export function Spinner({ size = SPINNER_PX, className: cls }: SpinnerProps): ReactElement {
	return (
		<span className={cn("wg-kit-spinner", cls)} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<circle cx={12} cy={12} r={9} />
			</svg>
		</span>
	);
}
