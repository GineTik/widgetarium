import { Icon, Shape } from "widgetarium/kit";
import type { App } from "@chrome/lib";

export const MARK_PX = { s: 28, m: 32 } as const;

export function AppMark({ app, px }: { readonly app: App; readonly px: number }) {
	return (
		<Shape name={app.shape} tones={[app.tone]} size={px}>
			<Icon name={app.icon} size={Math.round(px / 2)} />
		</Shape>
	);
}
