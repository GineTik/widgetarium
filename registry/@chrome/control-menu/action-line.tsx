import { Icon } from "widgetarium/kit";

export interface ActionLineProps {
	readonly icon: string;
	readonly said: string;
	readonly isSoon?: boolean;
}

export function ActionLine({ icon, said, isSoon = false }: ActionLineProps) {
	return (
		<span className={isSoon ? "flex items-center gap-items text-muted-foreground" : "flex items-center gap-items"}>
			<Icon name={icon} />
			<span className="min-w-0 flex-1 truncate text-sm">{said}</span>
			{isSoon ? <span className="text-xs">Soon</span> : null}
		</span>
	);
}
