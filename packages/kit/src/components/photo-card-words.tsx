import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface PhotoCardWordsProps {
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly meta?: string | undefined;
}

export function PhotoCardWords({ title, subtitle, meta }: PhotoCardWordsProps): ReactElement {
	return (
		<span className="wg-kit-photo-card-words">
			<b>{title}</b>
			{subtitle ? <span>{subtitle}</span> : null}
			{meta ? <span className="is-meta">{meta}</span> : null}
		</span>
	);
}
