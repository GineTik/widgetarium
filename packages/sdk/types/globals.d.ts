declare const h: typeof import("react").createElement;
declare const Fragment: typeof import("react").Fragment;

declare module "react-dom" {
	import type { ReactNode } from "react";
	export function createPortal(children: ReactNode, container: Element): ReactNode;
}

// TODO: type the kit; every import through widgetarium/kit is any until then
declare module "widgetarium/kit";
declare module "widgetarium/kit/emojis";
declare module "widgetarium/kit/charts";
