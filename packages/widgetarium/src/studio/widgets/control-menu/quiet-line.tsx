import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface QuietLineProps {
	readonly said: string | null;
	readonly name: string;
}

export function QuietLine({ said, name }: QuietLineProps): ReactElement | null {
	if (said === null) return null;
	return (
		<span className="wg-studio-refusal" role="status" data-name={name}>
			{said}
		</span>
	);
}
