import { useState } from "react";
import { Emblem, EmblemFallback, Icon, Input, PopoverItem, ScrollArea } from "widgetarium/kit";
import type { App } from "@chrome/lib";
import { AppMark, MARK_PX } from "./app-mark";

type ListedApp = App & { readonly ref: string };

export interface AppListProps {
	readonly apps: readonly ListedApp[];
	readonly currentId: string;
	readonly onOpen: (id: string) => void;
	readonly onCreate: () => void;
}

const SEARCH_FROM = 9;
const NO_MATCH = "No app is named like that";

export function AppList({ apps, currentId, onOpen, onCreate }: AppListProps) {
	const [typed, setTyped] = useState("");
	const shown = appsNamedLike(apps, typed);
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-parts" data-name="App list">
			<span className="px-3 pt-3 text-xs text-muted-foreground">Apps</span>
			{apps.length >= SEARCH_FROM ? (
				<div className="px-1">
					<Input
						block
						icon={<Icon name="search" />}
						placeholder="Search apps"
						value={typed}
						onInput={(event) => setTyped(event.currentTarget.value)}
					/>
				</div>
			) : null}
			<ScrollArea fade className="max-h-[228px]">
				<div className="flex flex-col" data-name="Apps">
					{shown.map((app) => (
						<PopoverItem key={app.ref} checked={app.id === currentId} onClick={() => onOpen(app.id)}>
							<span className="flex min-w-0 items-center gap-items">
								<AppMark app={app} px={MARK_PX.s} />
								<span className="truncate">{app.name}</span>
							</span>
						</PopoverItem>
					))}
					{shown.length === 0 ? <span className="px-3 py-2 text-sm text-muted-foreground">{NO_MATCH}</span> : null}
				</div>
			</ScrollArea>
			<PopoverItem onClick={onCreate}>
				<span className="flex items-center gap-items" data-name="New app">
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
function appsNamedLike(apps: readonly ListedApp[], typed: string): readonly ListedApp[] {
	const asked = typed.trim().toLowerCase();
	return [...apps]
		.filter((app) => app.name.toLowerCase().includes(asked))
		.sort((one, other) => one.name.localeCompare(other.name));
}
