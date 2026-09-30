import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { List } from "./list";

export interface SidebarGroupProps {
	readonly label?: ReactNode;
	readonly hint?: ReactNode;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function SidebarGroup({ label, hint, children, className: cls }: SidebarGroupProps): ReactElement {
	return (
		<div className={cn("wg-kit-side-group", cls)}>
			{[
				label ? (
					<span className="wg-kit-side-label" key="label">
						{label}
					</span>
				) : null,
				<List className="wg-kit-side-list" key="list">
					{children}
				</List>,
				hint ? (
					<p className="wg-kit-side-hint" key="hint">
						{hint}
					</p>
				) : null,
			]}
		</div>
	);
}
