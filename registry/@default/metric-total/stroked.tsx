import type { ReactNode } from "react";

type StrokedProps = {
	part?: string | undefined;
	className: string;
	size: number;
	weight: number;
	join?: boolean;
	children: ReactNode;
};

export function Stroked({ part, className, size, weight, join, children }: StrokedProps) {
	return (
		<svg
			data-part={part}
			className={`wg-kit-icon-glyph ${className}`}
			width={size}
			height={size}
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			style={{ strokeWidth: weight, strokeLinejoin: join ? "round" : "miter" }}
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}
