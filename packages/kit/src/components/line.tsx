import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface LineProps {
	readonly tone: string;
	readonly text: string;
	readonly className?: string | undefined;
}

export function Line({ tone, text, className }: LineProps): ReactElement {
	return (
		<div className={className} style={{ color: tone }}>
			{text}
		</div>
	);
}
