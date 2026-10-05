import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CommandMenuItemProps {
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly leading?: ReactNode;
	readonly trailing?: ReactNode;
	readonly isActive?: boolean | undefined;
	readonly onSelect?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export function CommandMenuItem({
	title,
	subtitle,
	leading,
	trailing,
	isActive = false,
	onSelect,
	className: cls,
}: CommandMenuItemProps): ReactElement {
	return (
		<button
			type="button"
			className={cn("wg-kit-command-item", isActive && "is-active", cls)}
			data-command-item=""
			onClick={onSelect}
		>
			{leading ? <span className="wg-kit-command-leading">{leading}</span> : null}
			<span className="wg-kit-command-text">
				<b>{title}</b>
				{subtitle ? <span>{subtitle}</span> : null}
			</span>
			{trailing ? <span className="wg-kit-command-trailing">{trailing}</span> : null}
		</button>
	);
}
