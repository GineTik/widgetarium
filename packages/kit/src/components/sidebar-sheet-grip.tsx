import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SidebarSheetState } from "../hooks/use-sidebar-sheet";

export interface SidebarSheetGripProps {
	readonly label: string;
	readonly sheet: SidebarSheetState;
}

export function SidebarSheetGrip({ label, sheet }: SidebarSheetGripProps): ReactElement {
	return (
		<button
			ref={sheet.gripRef}
			type="button"
			className="wg-kit-sheet-grip"
			aria-label={label}
			aria-pressed={sheet.isOpen}
			{...sheet.drag.gripProps}
		/>
	);
}
