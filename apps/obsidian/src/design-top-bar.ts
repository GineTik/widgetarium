import { createElement as h, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon, Popover, PopoverItem, Segmented } from "@widgetarium/kit";
import { CanvasTools } from "./design-tools.js";
import type { CanvasMode } from "./design-tools.js";

export interface CanvasTab {
	readonly value: string;
	readonly label: ReactNode;
}

export interface TopBarProps {
	readonly app: string;
	readonly said: string;
	readonly tabs: readonly CanvasTab[];
	readonly pages: readonly CanvasTab[];
	readonly page: string;
	readonly onPage: (page: string) => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly mode: CanvasMode;
	readonly onMode: (mode: CanvasMode) => void;
	readonly status?: ReactNode;
	readonly layers?: ReactNode;
}

const PAGES_TAB = "\u0000pages";
const PAGES = "Pages";

export function TopBar({
	app,
	said,
	tabs,
	pages,
	page,
	onPage,
	onAddPhotos,
	mode,
	onMode,
	status,
	layers,
}: TopBarProps): ReactElement {
	const [isPicking, setIsPicking] = useState(false);
	const isOnPage = pages.some((one) => one.value === page);
	const picked = useRef<string | null>(null);
	const pick = (next: string): void => {
		picked.current = next;
		setIsPicking(false);
	};
	const turnToPicked = (): void => {
		const next = picked.current;
		picked.current = null;
		if (next !== null) onPage(next);
	};
	const pagesTab: CanvasTab = {
		value: PAGES_TAB,
		label: h(
			Popover,
			{
				trigger: h("span", { className: "wg-design-pages-trigger" }, [
					PAGES,
					h(Icon, { key: "chevron", name: "chevron-down", size: 14 }),
				]),
				open: isPicking,
				onOpenChange: setIsPicking,
				onExited: turnToPicked,
				placement: "below",
				isPortaled: true,
				className: "wg-design-pages-menu",
			},
			pages.map((one) =>
				h(PopoverItem, { key: one.value, checked: one.value === page, onClick: () => pick(one.value) }, one.label),
			),
		),
	};
	return h("div", { className: "wg-design-topbar" }, [
		h("div", { key: "head", className: "wg-design-head" }, [
			layers ?? null,
			h("b", { key: "app" }, app),
			h("span", { key: "count" }, said),
			h(CanvasTools, { key: "tools", mode, onMode, onAddPhotos }),
			status ?? null,
		]),
		h(Segmented<string>, {
			key: "pages",
			items: pages.length > 0 ? [...tabs, pagesTab] : tabs,
			value: isOnPage ? PAGES_TAB : page,
			onValueChange: (next) => (next === PAGES_TAB ? undefined : onPage(next)),
			size: "s",
			className: "wg-design-page-switch",
		}),
	]);
}
