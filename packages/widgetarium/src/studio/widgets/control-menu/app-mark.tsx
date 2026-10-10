import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Shape } from "@widgetarium/kit";
import type { StudioApp } from "../../shared/studio-app.js";

export const MARK_PX = { s: 22, m: 28 } as const;

export interface AppMarkProps {
	readonly app: StudioApp;
	readonly px: number;
}

export function AppMark({ app, px }: AppMarkProps): ReactElement {
	return (
		<Shape name={app.shape} tones={["ink"]} look="flat" size={px}>
			<span className={px < MARK_PX.m ? "wg-studio-mark-letter is-s" : "wg-studio-mark-letter"}>
				{app.name.slice(0, 1).toUpperCase()}
			</span>
		</Shape>
	);
}
