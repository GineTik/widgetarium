import { Emblem, EmblemFallback, Icon, PopoverItem, ScrollArea } from "widgetarium/kit";
import { AppMark, MARK_PX } from "./app-mark";
import type { AppListProps } from "./app-list";

export function AppRail({ apps, currentId, onOpen, onCreate }: AppListProps) {
	return (
		<div className="flex w-14 shrink-0 flex-col items-center gap-parts" data-name="App rail">
			<ScrollArea fade className="max-h-[228px]">
				<div className="flex flex-col items-center" data-name="Apps">
					{apps
						.filter((app) => app.id !== currentId)
						.map((app) => (
							<PopoverItem key={app.ref} aria-label={app.name} title={app.name} onClick={() => onOpen(app.id)}>
								<AppMark app={app} px={MARK_PX.m} />
							</PopoverItem>
						))}
				</div>
			</ScrollArea>
			<PopoverItem aria-label="New app" title="New app" onClick={onCreate}>
				<Emblem size={MARK_PX.s} shape="rounded">
					<EmblemFallback>
						<Icon name="plus" />
					</EmblemFallback>
				</Emblem>
			</PopoverItem>
		</div>
	);
}
