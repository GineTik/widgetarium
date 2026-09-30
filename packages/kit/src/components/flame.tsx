import { createElement as h } from "react";
import type { ReactElement } from "react";

export const FLAME =
	"M11.93 1.14C12.29 0.82 12.81 0.66 13.35 0.81C13.78 0.92 14.19 1.1 14.58 1.32C16.15 2.25 18.31 3.74 20.07 5.8C21.84 7.87 23.25 10.55 23.25 13.84C23.25 17.05 21.97 19.45 19.87 21.01C17.8 22.56 15 23.25 12 23.25C9 23.25 6.2 22.56 4.13 21.01C2.03 19.45 0.75 17.05 0.75 13.84C0.75 9.04 3.75 5.53 6.52 3.31C7.56 2.48 8.91 3.13 9.29 4.18C9.54 4.9 9.85 5.47 10.18 5.8C10.21 5.83 10.24 5.84 10.29 5.83C10.34 5.83 10.41 5.79 10.47 5.72C11.04 4.94 11.29 3.67 11.36 2.38C11.38 1.9 11.59 1.45 11.93 1.14ZM12.36 11.67C12.13 11.55 11.87 11.55 11.64 11.67C10.65 12.15 8 13.69 8 16.3C8 18.51 9.79 19.5 12 19.5C14.21 19.5 16 18.51 16 16.3C16 13.69 13.35 12.15 12.36 11.67Z";

export interface FlameProps {
	readonly size: number;
	readonly className?: string | undefined;
}

export function Flame({ size, className }: FlameProps): ReactElement {
	return (
		<svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d={FLAME} />
		</svg>
	);
}
