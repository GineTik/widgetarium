import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Emblem, EmblemFallback, Icon, Input, PopoverItem, ScrollArea } from "@widgetarium/kit";
import type { StudioApp } from "../../shared/studio-app.js";
import { AppMark, MARK_PX } from "./app-mark.js";

export interface AppListProps {
	readonly apps: readonly StudioApp[];
	readonly currentId: string;
	readonly onOpen: (id: string) => void;
	readonly onCreate: () => void;
}

const SEARCH_FROM = 9;
const NO_MATCH = "No app is named like that";

export function AppList({ apps, currentId, onOpen, onCreate }: AppListProps): ReactElement {
	const [typed, setTyped] = useState("");
	const shown = appsNamedLike(apps, typed);
	return (
		<div className="wg-studio-app-list" data-name="App list">
			<span className="wg-studio-list-label">Apps</span>
			{apps.length >= SEARCH_FROM ? (
				<div className="wg-studio-search">
					<Input
						block
						icon={<Icon name="search" />}
						placeholder="Search apps"
						value={typed}
						onInput={(event) => setTyped(event.currentTarget.value)}
					/>
				</div>
			) : null}
			<ScrollArea fade className="wg-studio-apps-scroll">
				<div className="wg-studio-apps" data-name="Apps">
					{shown.map((app) => (
						<PopoverItem key={app.id} checked={app.id === currentId} onClick={() => onOpen(app.id)}>
							<span className="wg-studio-app-row">
								<AppMark app={app} px={MARK_PX.s} />
								<span className="wg-studio-app-name">{app.name}</span>
							</span>
						</PopoverItem>
					))}
					{shown.length === 0 ? <span className="wg-studio-no-match">{NO_MATCH}</span> : null}
				</div>
			</ScrollArea>
			<PopoverItem onClick={onCreate}>
				<span className="wg-studio-app-row" data-name="New app">
					<Emblem size={MARK_PX.s} shape="rounded">
						<EmblemFallback>
							<Icon name="plus" />
						</EmblemFallback>
					</Emblem>
					<span>New app</span>
				</span>
			</PopoverItem>
		</div>
	);
}

// TRADE-OFF: the widget narrows its own rows, since the apps query takes no keyword yet; the list is capped at fifty
function appsNamedLike(apps: readonly StudioApp[], typed: string): readonly StudioApp[] {
	const asked = typed.trim().toLowerCase();
	return [...apps]
		.filter((app) => app.name.toLowerCase().includes(asked))
		.sort((one, other) => one.name.localeCompare(other.name));
}
