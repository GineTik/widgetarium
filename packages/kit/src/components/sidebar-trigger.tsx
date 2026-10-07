import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";
import { useSidebar } from "./sidebar-context";

const TOGGLE_SIDEBAR = "Toggle Sidebar";

export function SidebarTrigger({ onClick, label = TOGGLE_SIDEBAR, ...rest }: IconButtonProps): ReactElement {
	const { toggleSidebar } = useSidebar();
	return (
		<IconButton
			data-slot="sidebar-trigger"
			variant="ghost"
			size="s"
			label={label}
			{...rest}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
		>
			<Icon name="panel-left" />
		</IconButton>
	);
}
