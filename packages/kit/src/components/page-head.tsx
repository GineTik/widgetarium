import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Count } from "./count";
import { Heading } from "./heading";

export interface PageHeadProps {
	readonly title?: string | undefined;
	readonly count?: ReactNode;
	readonly action?: ReactNode;
	readonly back?: ReactNode;
}

export function PageHead({ title, count, action, back }: PageHeadProps): ReactNode {
	if (!title && !action && !back) return null;
	return (
		<header className="wg-kit-page-head">
			{back ? <div className="wg-kit-page-back">{back}</div> : null}
			{title ? (
				<Heading level={1} size={2} className="wg-kit-page-title">
					{title}
				</Heading>
			) : null}
			{count !== undefined ? <Count>{count}</Count> : null}
			{action ? <div className="wg-kit-page-action">{action}</div> : null}
		</header>
	);
}
