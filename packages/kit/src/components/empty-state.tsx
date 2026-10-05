import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { Shape } from "../shapes/shape";
import type { ShapeName } from "../shapes/shape-names";
import { cn } from "../utils/cn";

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
	const size = isCompact ? 64 : 120;
	return (
		<div className={cn("wg-kit-empty", isCompact && "is-compact", cls)}>
			<span className="wg-kit-empty-art" aria-hidden="true">
				<Shape name={shape} tones={tones} size={size} />
				{isCompact ? null : <Shape name="circle" tones={tones} size={size * 0.34} className="is-left" />}
				{isCompact ? null : <Shape name="sunny" tones={tones} size={size * 0.24} className="is-right" />}
			</span>
			<b className="wg-kit-empty-title">{title}</b>
			{text ? <span className="wg-kit-empty-text">{text}</span> : null}
			{action ? <span className="wg-kit-empty-action">{action}</span> : null}
		</div>
	);
}
