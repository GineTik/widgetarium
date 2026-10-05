import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import type { ShapeName } from "../shapes/shape-names";
import { cn } from "../utils/cn";
import { EmptyStateArt } from "./empty-state-art";

export interface EmptyStateProps {
	readonly title: string;
	readonly text?: string | undefined;
	readonly shape?: ShapeName | undefined;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly isCompact?: boolean | undefined;
	readonly action?: ReactNode;
	readonly className?: string | undefined;
}

export function EmptyState({
	title,
	text,
	shape = "cookie9-sided",
	tones,
	isCompact = false,
	action,
	className: cls,
}: EmptyStateProps): ReactElement {
	return (
		<div className={cn("wg-kit-empty", isCompact && "is-compact", cls)}>
			<EmptyStateArt shape={shape} tones={tones} isCompact={isCompact} />
			<b className="wg-kit-empty-title">{title}</b>
			{text ? <span className="wg-kit-empty-text">{text}</span> : null}
			{action ? <span className="wg-kit-empty-action">{action}</span> : null}
		</div>
	);
}
