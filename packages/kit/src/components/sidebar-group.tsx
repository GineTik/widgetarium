import { Children, createElement as h, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { List } from "./list";
import { SidebarGroupContent, SidebarGroupLabel, SidebarGroupOfParts, SidebarMenu } from "./sidebar-parts";

export interface SidebarGroupProps {
	readonly label?: ReactNode;
	readonly hint?: ReactNode;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

const SHADCN_GROUP_PARTS: ReadonlySet<unknown> = new Set([SidebarGroupLabel, SidebarGroupContent, SidebarMenu]);

// TRADE-OFF: a group of rows keeps its plate unless it holds shadcn's parts, which bring their own
export function SidebarGroup({ label, hint, children, className: cls }: SidebarGroupProps): ReactElement {
	if (holdsShadcnParts(children)) return <SidebarGroupOfParts className={cls} children={children} />;
	return (
		<div data-slot="sidebar-group" className={cn("wg-kit-side-group", cls)}>
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

function holdsShadcnParts(children: ReactNode): boolean {
	return Children.toArray(children).some((child) => isValidElement(child) && SHADCN_GROUP_PARTS.has(child.type));
}
