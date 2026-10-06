import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Segmented } from "@widgetarium/kit";
import { AddPhoto } from "./design-add-photo.js";

export interface TopBarProps {
	readonly app: string;
	readonly said: string;
	readonly pages: readonly string[];
	readonly page: string;
	readonly onPage: (page: string) => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
	readonly status?: ReactNode;
	readonly layers?: ReactNode;
}

export function TopBar({ app, said, pages, page, onPage, onAddPhotos, status, layers }: TopBarProps): ReactElement {
	return h("div", { className: "wg-design-topbar" }, [
		h("div", { key: "head", className: "wg-design-head" }, [
			layers ?? null,
			h("b", { key: "app" }, app),
			h("span", { key: "count" }, said),
			h(AddPhoto, { key: "add", onAddPhotos }),
			status ?? null,
		]),
		h(Segmented<string>, {
			key: "pages",
			items: pages.map((one) => ({ value: one, label: one })),
			value: page,
			onValueChange: onPage,
			size: "s",
			className: "wg-design-page-switch",
		}),
	]);
}
