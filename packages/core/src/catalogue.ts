import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { TemplateGrid } from "./template-gallery.js";
import type { OnUseTemplate } from "./template-gallery.js";
import { docPage } from "./docs.js";
import { DocsPage } from "./docs-page.js";
import { useCatalogueView } from "./catalogue-view.js";
import type { CatalogueKind, CatalogueView, RankEntry } from "./catalogue-view.js";
import { Tile } from "./catalogue-tile.js";
import type { CatalogueHost } from "./catalogue-preview.js";
import type { CatalogueMode, OnInstall, OnPick } from "./catalogue-install-press.js";
import type { CatalogueDefinition, ShelfEntry } from "./catalogue-entries.js";
import { filterSheet, searchField, sideHead, sidebarOf, topBar } from "./catalogue-chrome.js";
import type { WidgetLookup } from "./registry.js";
import type { WidgetLock } from "./engine/widget-lock.js";
import type { Template } from "./templates.js";

export {
	actionFor,
	cardTile,
	facetsMatching,
	facetsOf,
	filterEntries,
	measureCards,
	packOf,
	updateOffered,
} from "./catalogue-entries.js";

export interface CatalogueProps {
	readonly registry: WidgetLookup;
	readonly host?: CatalogueHost | null | undefined;
	readonly mode?: CatalogueMode | undefined;
	readonly kind?: CatalogueKind | undefined;
	readonly available?: readonly CatalogueDefinition[] | undefined;
	readonly templates?: readonly Template[] | undefined;
	readonly rank?: RankEntry | undefined;
	readonly lock?: WidgetLock | null | undefined;
	readonly onPick?: OnPick | undefined;
	readonly onInstall?: OnInstall | undefined;
	readonly onUninstall?: ((id: string) => unknown) | undefined;
	readonly onUseTemplate?: OnUseTemplate | undefined;
}

type CatalogueScreen = CatalogueView &
	Pick<CatalogueProps, "registry" | "host" | "onPick" | "onInstall" | "onUseTemplate"> & {
		readonly mode: CatalogueMode;
	};

type ColumnsStyle = CSSProperties & { readonly "--wg-cat-columns": number };

const NO_TEMPLATE = "No template answers to that.";
const NOTHING_ANSWERS = "Nothing here answers to that.";
const SHORT_LABEL = "These want more than this slot hands down";

export function Catalogue({
	registry,
	host,
	mode = "browse",
	kind = "board",
	available = [],
	templates = [],
	rank,
	lock = null,
	onPick,
	onInstall,
	onUseTemplate,
}: CatalogueProps): ReactElement {
	// TODO: no entrance for onUninstall since the card menu went — uninstall needs one of its own
	const view = useCatalogueView({ registry, mode, kind, available, templates, rank, lock });
	return catalogueScreen({ ...view, registry, host, mode, onPick, onInstall, onUseTemplate });
}

function catalogueScreen(view: CatalogueScreen): ReactElement {
	const { phone, page, onShelf, isSheetOpen, setSheetOpen, empty } = view;
	return h("div", { className: phone ? "wg-cat is-phone" : "wg-cat", ref: view.rootRef }, [
		phone ? null : sidebarOf(view),
		h("section", { className: "wg-cat-main", key: "main" }, [
			phone ? sideHead(view) : null,
			phone ? searchField(view) : null,
			page ? null : topBar(view),
			h(
				"div",
				{
					key: "scroll",
					ref: view.scrollRef,
					className: "wg-cat-scroll",
				},
				catalogueBody(view),
			),
			empty && !page
				? h("p", { className: "wg-cat-none", key: "none" }, onShelf ? NO_TEMPLATE : NOTHING_ANSWERS)
				: null,
		]),
		phone && isSheetOpen && !page && !onShelf
			? h("div", { className: "wg-cat-scrim", key: "scrim", onClick: () => setSheetOpen(false) })
			: null,
		phone && !page && !onShelf ? filterSheet(view) : null,
	]);
}

function catalogueBody(view: CatalogueScreen): ReactElement | null {
	const { page, host, openPage, onShelf, width } = view;
	const opened = docPage(page);
	if (opened) return h(DocsPage, { page: opened, host, onOpenPage: openPage });
	if (onShelf)
		return h(TemplateGrid, {
			templates: view.foundTemplates,
			columns: view.templateCards.columns,
			nameOf: view.nameOf,
			onUse: view.onUseTemplate,
		});
	if (width <= 0) return null;
	const style: ColumnsStyle = { "--wg-cat-columns": view.cards.columns };
	return h(
		"div",
		{ className: "wg-cat-grid", style },
		view.placed.flatMap((entry, index) => tileWithDivide(view, entry, index)),
	);
}

function tileWithDivide(
	{ registry, host, mode, onPick, onInstall, divide }: CatalogueScreen,
	entry: ShelfEntry,
	index: number,
): ReactElement[] {
	const id = entry.manifest["id"];
	const card = h(Tile, {
		key: typeof id === "string" ? id : index,
		entry,
		tile: entry.tile,
		registry,
		host,
		mode,
		lacks: entry.fit?.lacks ?? null,
		onPick,
		onInstall,
	});
	if (index !== divide) return [card];
	return [h("p", { className: "wg-cat-divide", key: "divide" }, SHORT_LABEL), card];
}
