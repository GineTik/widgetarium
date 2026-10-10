import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, LayoutItem, Rows } from "@widgetarium/kit";
import type { StudioApp } from "../../shared/studio-app.js";
import { ActionLine } from "./action-line.js";
import { AppMark, MARK_PX } from "./app-mark.js";

export interface CanvasAction {
	readonly icon: string;
	readonly said: string;
	readonly run: () => void;
}

export interface CurrentAppProps {
	readonly app: StudioApp;
	readonly canvas: CanvasAction;
}

export function CurrentApp({ app, canvas }: CurrentAppProps): ReactElement {
	return (
		<Card data-name="Current app">
			<Rows data-name="Profile and actions">
				<LayoutItem>
					<span className="wg-studio-profile">
						<AppMark app={app} px={MARK_PX.m} />
						<span className="wg-studio-profile-text">
							<span className="wg-studio-profile-name">{app.name}</span>
							<span className="wg-studio-profile-line">{app.line}</span>
						</span>
					</span>
				</LayoutItem>
				<LayoutItem role="button" tabIndex={0} onClick={canvas.run}>
					<ActionLine icon={canvas.icon} said={canvas.said} />
				</LayoutItem>
				<LayoutItem aria-disabled="true">
					<ActionLine icon="settings" said="Settings" isSoon />
				</LayoutItem>
				<LayoutItem aria-disabled="true">
					<ActionLine icon="plug" said="Connect services" isSoon />
				</LayoutItem>
			</Rows>
		</Card>
	);
}
