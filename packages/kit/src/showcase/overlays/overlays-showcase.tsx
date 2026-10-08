import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Toaster, TooltipProvider } from "../../index";
import { AccountMenu } from "./account-menu";
import { AppMenubar } from "./app-menubar";
import { DeleteAlert } from "./delete-alert";
import { DocsNavigation } from "./docs-navigation";
import { EditSheet } from "./edit-sheet";
import { GoalDrawer } from "./goal-drawer";
import { Hints } from "./hints";
import { NoteContextMenu } from "./note-context-menu";
import type { OpenedOverlay } from "./opened-overlay";
import { PlacedPopover } from "./placed-popover";
import { ToastButtons } from "./toast-buttons";

export interface OverlaysShowcaseProps {
	readonly opened: OpenedOverlay;
}

export function OverlaysShowcase({ opened }: OverlaysShowcaseProps): ReactElement {
	const isFloating = opened === "floating";
	return (
		<TooltipProvider delayDuration={300}>
			<div className="wg-showcase-overlays">
				<div className="wg-showcase-overlays-row">
					<AccountMenu isOpen={isFloating} />
					<AppMenubar isOpen={isFloating} />
					<DocsNavigation isOpen={isFloating} />
				</div>
				<div className="wg-showcase-overlays-row is-low">
					<Hints isOpen={isFloating} />
					<PlacedPopover isOpen={isFloating} />
					<NoteContextMenu />
				</div>
				<div className="wg-showcase-row">
					<EditSheet isOpen={opened === "sheet" || opened === "toast"} />
					<GoalDrawer isOpen={opened === "drawer"} />
					<DeleteAlert isOpen={opened === "alert"} />
					<ToastButtons isShot={opened === "toast"} />
				</div>
				<Toaster
					position={opened === "toast" ? "bottom-left" : "bottom-right"}
					expand={opened === "toast"}
					richColors
				/>
			</div>
		</TooltipProvider>
	);
}
