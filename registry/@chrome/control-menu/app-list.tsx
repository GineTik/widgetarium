import { Emblem, EmblemFallback, Icon, PopoverItem, ScrollArea } from "widgetarium/kit";
import type { App } from "@chrome/lib";
import { AppMark, MARK_PX } from "./app-mark";

export interface AppListProps {
	readonly apps: readonly (App & { readonly ref: string })[];
	readonly currentId: string;
	readonly onOpen: (id: string) => void;
	readonly onCreate: () => void;
}

export function AppList({ apps, currentId, onOpen, onCreate }: AppListProps) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-parts" data-name="App list">
			<span className="px-3 text-xs text-muted-foreground">Apps</span>
			<ScrollArea fade className="max-h-[228px]">
				<div className="flex flex-col" data-name="Apps">
					{apps.length === 0 ? <span className="px-3 text-sm text-muted-foreground">No other apps yet</span> : null}
					{apps.map((app) => (
						<PopoverItem key={app.ref} checked={app.id === currentId} onClick={() => onOpen(app.id)}>
							<span className="flex min-w-0 items-center gap-items">
								<AppMark app={app} px={MARK_PX.s} />
								<span className="truncate">{app.name}</span>
							</span>
						</PopoverItem>
					))}
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
