import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button, Icon, Popover, PopoverItem, Segmented } from "@widgetarium/kit";

export interface CanvasTab {
	readonly value: string;
	readonly label: ReactNode;
}

export interface TopBarProps {
	readonly app: string;
	readonly said: string;
	readonly leading: readonly CanvasTab[];
	readonly pages: readonly CanvasTab[];
	readonly trailing: readonly CanvasTab[];
	readonly page: string;
	readonly onPage: (page: string) => void;
	readonly canvasTools: ReactNode;
	readonly onReturn: () => void;
	readonly status?: ReactNode;
	readonly layers?: ReactNode;
	readonly corners?: TopBarCorners | undefined;
}

export interface TopBarCorners {
	readonly start: ReactNode;
	readonly end: ReactNode;
}

const PAGES_TAB = "\u0000pages";
const PAGES = "Pages";
const RETURN = "Back to view";

export function TopBar({
	app,
	said,
	leading,
	pages,
	trailing,
	page,
	onPage,
	canvasTools,
	onReturn,
	status,
	layers,
	corners,
}: TopBarProps): ReactElement {
	const [isPicking, setIsPicking] = useState(false);
	const isOnPage = pages.some((one) => one.value === page);
	const [asked, ask] = useTabAskedBefore(page);
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
	return h("div", { className: `wg-design-topbar${corners ? " has-corners" : ""}` }, [
		h("div", { key: "start", className: "wg-design-top-start" }, [
			corners?.start ?? null,
			h("div", { key: "head", className: "wg-design-head" }, [
				layers ?? null,
				h("b", { key: "app" }, app),
				h("span", { key: "count" }, said),
				canvasTools,
				status ?? null,
			]),
		]),
		h("div", { key: "end", className: "wg-design-top-end" }, [
			h(Segmented<string>, {
				key: "pages",
				items: [...leading, ...(pages.length > 0 ? [pagesTab] : []), ...trailing],
				value: asked ?? (isOnPage ? PAGES_TAB : page),
				onValueChange: (next) => {
					if (next === PAGES_TAB) return;
					ask(next);
					onPage(next);
				},
				className: "wg-design-page-switch",
			}),
			h(Button, { key: "return", variant: "tinted", onClick: onReturn }, RETURN),
			corners?.end ?? null,
		]),
	]);
}

function useTabAskedBefore(page: string): readonly [string | null, (next: string) => void] {
	const [asked, setAsked] = useState<string | null>(null);
	useEffect(() => setAsked(null), [page]);
	return [asked, setAsked];
}
