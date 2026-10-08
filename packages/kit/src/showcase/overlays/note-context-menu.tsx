import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "../../index";

export function NoteContextMenu(): ReactElement {
	return (
		<ContextMenu>
			<ContextMenuTrigger className="wg-showcase-context-area" id="wg-showcase-context-area">
				Right click here
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>
					Back <ContextMenuShortcut>⌘[</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem disabled>Forward</ContextMenuItem>
				<ContextMenuItem>Reload</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive">Delete note</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
