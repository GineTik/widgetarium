import { Shape } from "widgetarium/kit";
import type { App } from "@chrome/lib";

export const MARK_PX = { s: 28, m: 32 } as const;

export function AppMark({ app, px }: { readonly app: App; readonly px: number }) {
	return (
		<Shape name={app.shape} tones={["ink"]} look="flat" size={px}>
			<span className="text-sm font-medium">{app.name.slice(0, 1).toUpperCase()}</span>
		</Shape>
	);
}
