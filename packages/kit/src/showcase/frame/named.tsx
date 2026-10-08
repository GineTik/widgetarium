import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface NamedProps {
	readonly name: string;
	readonly children?: ReactNode;
}

export function Named({ name, children }: NamedProps): ReactElement {
	return (
		<div className="wg-showcase-named">
			<span className="wg-showcase-code">{name}</span>
			{children}
		</div>
	);
}
