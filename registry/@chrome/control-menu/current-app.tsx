import { Card, LayoutItem, Rows } from "widgetarium/kit";
import type { App } from "@chrome/lib";
import { ActionLine } from "./action-line";
import { AppMark, MARK_PX } from "./app-mark";

export interface CurrentAppProps {
	readonly app: App;
	readonly onEdit: () => void;
}

export function CurrentApp({ app, onEdit }: CurrentAppProps) {
	return (
		<Card data-name="Current app">
			<Rows data-name="Profile and actions">
				<LayoutItem>
					<span className="flex min-w-0 items-center gap-items" data-name="Profile">
						<AppMark app={app} px={MARK_PX.m} />
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-base font-medium">{app.name}</span>
							<span className="truncate text-xs text-muted-foreground">{app.line}</span>
						</span>
					</span>
				</LayoutItem>
				<LayoutItem role="button" tabIndex={0} onClick={onEdit}>
					<ActionLine icon="pencil-ruler" said="Edit in canvas" />
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
