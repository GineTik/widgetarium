import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StudioApp } from "../../shared/studio-app.js";

export const MARK_PX = { s: 22, m: 28 } as const;

const MARK_CORNER = 0.28;

export interface AppMarkProps {
	readonly app: StudioApp;
	readonly px: number;
}

export function AppMark({ app, px }: AppMarkProps): ReactElement {
	return (
		<span
			className={px < MARK_PX.m ? "wg-studio-mark is-s" : "wg-studio-mark"}
			style={{ width: px, height: px, borderRadius: Math.round(px * MARK_CORNER) }}
			aria-hidden="true"
		>
			{app.name.slice(0, 1).toUpperCase()}
		</span>
	);
}
