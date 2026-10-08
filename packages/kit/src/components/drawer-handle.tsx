import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { GripProps } from "../hooks/use-sheet-drag";

export interface DrawerHandleProps {
	readonly gripProps: GripProps;
}

const DRAG_TO_CLOSE = "Drag down to close";

export function DrawerHandle({ gripProps }: DrawerHandleProps): ReactElement {
	return (
		<div className="wg-kit-drawer-handle" role="button" tabIndex={-1} aria-label={DRAG_TO_CLOSE} {...gripProps}>
			<span className="wg-kit-drawer-grip" />
		</div>
	);
}
