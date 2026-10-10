import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import type { StudioApp } from "../../shared/studio-app.js";
import { AppMark, MARK_PX } from "./app-mark.js";

export interface MenuTriggerProps {
	readonly app: StudioApp | null;
	readonly isOpen: boolean;
}

const UNREAD_LABEL = "Apps menu";

export function MenuTrigger({ app, isOpen }: MenuTriggerProps): ReactElement {
	return (
		<Button
			variant={isOpen ? "secondary" : "ghost"}
			size="icon-sm"
			aria-label={app ? `${app.name} menu` : UNREAD_LABEL}
		>
			{app ? <AppMark app={app} px={MARK_PX.s} /> : <Icon name="layout-grid" />}
		</Button>
	);
}
