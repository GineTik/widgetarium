import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { DrawerGrip } from "../hooks/use-drawer-motion";

export interface DrawerHandleProps {
	readonly grip: DrawerGrip;
}

export function DrawerHandle({ grip }: DrawerHandleProps): ReactElement {
	return (
		<div
			className="wg-kit-drawer-handle"
			data-slot="drawer-handle"
			role="button"
			tabIndex={0}
			aria-label={grip.label}
			aria-keyshortcuts="ArrowUp ArrowDown Home End Enter"
			onKeyDown={grip.onKeyDown}
		>
			<span className="wg-kit-drawer-grip" />
		</div>
	);
}
