import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSegmentedThumb } from "@widgetarium/kit";
import type { TabStripFacts } from "./tab-strip-verbs.js";
import { useTabStrip } from "./use-tab-strip.js";
import { tabButtonOf } from "./tab-button.js";
import { tabsMenuOf } from "./tabs-menu.js";
import { archiveDialogOf, deleteConfirmOf } from "./tabs-archive.js";

const STYLE = `
.wg-tabs { display: flex; align-items: center; gap: var(--size-4-2, 8px); flex-wrap: wrap; }

.wg-tabs-tab.is-editing { outline: none; cursor: text; }
.wg-tabs-tab.is-editing::before,
.wg-tabs-tab.is-editing:focus-visible::before { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

.wg-tabs-more svg { width: 15px; height: 15px; }

.wg-tabs-archive .wg-tabs-empty { margin: 0; font-size: var(--font-ui-small, 14px); color: var(--wg-kit-text-muted); }
.wg-tabs-archive .wg-tabs-act { flex: none; }
`;

export interface EditableTabsProps extends TabStripFacts {
	readonly deleteWarning?: ReactNode;
	readonly className?: string | undefined;
}

export function toTabList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((item: unknown) => String(item ?? "").trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export function EditableTabs({ deleteWarning, className, ...facts }: EditableTabsProps): ReactElement {
	const strip = useTabStrip(facts);
	const { listRef, thumbProps } = useSegmentedThumb(strip.selected, strip.tabs);

	return h("div", { className: className ? `wg-tabs ${className}` : "wg-tabs" }, [
		h("style", { key: "style" }, STYLE),
		h("div", { key: "strip", className: "wg-kit-seg", ref: listRef, role: "tablist" }, [
			h("span", { key: "thumb", ...thumbProps }),
			...strip.tabs.map((tab) => tabButtonOf(tab, strip)),
		]),
		tabsMenuOf(strip),
		archiveDialogOf(strip),
		deleteConfirmOf(strip, deleteWarning),
	]);
}
