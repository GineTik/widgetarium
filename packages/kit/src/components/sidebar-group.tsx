import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { List } from "./list";
import { cx } from "../utils/cx";

export function SidebarGroup({ label, hint, children, className: cls }: LooseProps) {
	return (
		<div className={cx("wg-kit-side-group", cls)}>
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
