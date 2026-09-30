import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, List, SidebarRow } from "@widgetarium/kit";
import { EVERY_PACK, facetsMatching, fillLine } from "./catalogue-entries.js";
import type { CatalogueFacets, Facet, Showing } from "./catalogue-entries.js";
import { FacetGroup } from "./catalogue-facet-group.js";

export type ShowingCounts = Readonly<Record<Showing, number>>;

export interface FacetsProps {
	readonly counts: ShowingCounts;
	readonly facets: CatalogueFacets;
	readonly showing: Showing;
	readonly onShowing: (showing: Showing) => void;
	readonly pack: string;
	readonly onPack: (pack: string) => void;
	readonly tag: string | null;
	readonly onTag: (tag: string | null) => void;
	readonly packQuery: string;
	readonly onPackQuery: (query: string) => void;
	readonly tagQuery: string;
	readonly onTagQuery: (query: string) => void;
}

const SHOWING: Readonly<Record<Showing, { readonly label: string; readonly icon: string }>> = {
	all: { label: "All widgets", icon: "widget" },
	installed: { label: "Installed", icon: "tick" },
	update: { label: "Update ready", icon: "update" },
};
const SHOWING_ORDER: readonly Showing[] = ["all", "installed", "update"];
const SEARCH_PACKS = "Filter packs";
const SEARCH_TAGS = "Filter tags";
const PACKS = "Packs";
const TAGS = "Tags";
const SHOW = "Show";
const MORE_TAGS = "+{count}";
const TAGS_SHOWN = 6;

export function Facets(props: FacetsProps): ReactElement[] {
	const { facets, pack, onPack, tag, onTag, packQuery, onPackQuery, tagQuery, onTagQuery } = props;
	return [
		showingGroup(props),
		h(
			FacetGroup,
			{ key: "packs", label: PACKS, placeholder: SEARCH_PACKS, query: packQuery, onQuery: onPackQuery },
			packList(facetsMatching(facets.packs, packQuery), pack, onPack),
		),
		h(
			FacetGroup,
			{ key: "tags", label: TAGS, placeholder: SEARCH_TAGS, query: tagQuery, onQuery: onTagQuery },
			tagChips(facetsMatching(facets.tags, tagQuery), tag, onTag),
		),
	];
}

function showingGroup({ counts, showing, onShowing }: FacetsProps): ReactElement {
	return h("div", { className: "wg-kit-side-group", key: "show" }, [
		h("span", { className: "wg-kit-side-label", key: "label" }, SHOW),
		h(
			List,
			{ className: "wg-kit-side-list", key: "list" },
			SHOWING_ORDER.map((key) =>
				h(SidebarRow, {
					key,
					as: "button",
					className: `wg-cat-show is-${key}`,
					icon: h(Icon, { name: SHOWING[key].icon, size: 14 }),
					label: SHOWING[key].label,
					value: String(counts[key]),
					selected: showing === key,
					onClick: () => onShowing(key),
				}),
			),
		),
	]);
}

function packList(packs: readonly Facet[], pack: string, onPack: (pack: string) => void): ReactElement {
	return h(
		List,
		{ className: "wg-kit-side-list wg-cat-packs", key: "list" },
		packs.map((facet) =>
			h(SidebarRow, {
				key: facet.name,
				as: "button",
				className: "wg-cat-pack",
				icon: h("span", { className: "wg-cat-pack-mark" }, facet.name.replace("@", "").charAt(0).toUpperCase()),
				label: facet.name,
				value: String(facet.count),
				selected: pack === facet.name,
				onClick: () => onPack(pack === facet.name ? EVERY_PACK : facet.name),
			}),
		),
	);
}

function tagChips(tags: readonly Facet[], tag: string | null, onTag: (tag: string | null) => void): ReactElement {
	const chips = tags.slice(0, TAGS_SHOWN);
	const rest = tags.length - chips.length;
	return h("div", { className: "wg-cat-tags", key: "chips" }, [
		h(
			"div",
			{ className: "wg-cat-tag-row", key: "row" },
			chips.map((facet) =>
				h(
					Button,
					{
						key: facet.name,
						className: tag === facet.name ? "wg-cat-tag is-on" : "wg-cat-tag",
						size: "s",
						variant: tag === facet.name ? "accent" : "neutral",
						onClick: () => onTag(tag === facet.name ? null : facet.name),
					},
					facet.name,
				),
			),
		),
		rest > 0 ? h("span", { key: "more", className: "wg-cat-more-tags" }, fillLine(MORE_TAGS, { count: rest })) : null,
	]);
}
