import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, SidebarGroup, SidebarRow } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { typedIn, withTyped } from "../gateway/props.js";
import { hostGatewayFor, isFolderStat, sourcesFor } from "../engine/host-gateways.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { offeredEntries } from "./offered-boxes.js";
import { FROM_WIDGET, IN_VAULT, STATISTICS, TYPED_HERE, blankValue, writeProp, writtenText } from "./prop-writing.js";
import { note } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { openStatStep } from "./stat-body.js";

const SOURCE_KIND: ReadonlyMap<string, string> = new Map([
	["@core/typed-value", TYPED_HERE],
	["@core/typed-rows", TYPED_HERE],
	["@obsidian/file", IN_VAULT],
	["@obsidian/folder", IN_VAULT],
	["@core/from-tile-value", FROM_WIDGET],
	["@core/from-tile-rows", FROM_WIDGET],
]);

const STAT_SOURCE = "@stats/";

const SOURCES_OPEN = "#source";

const WHERE_FROM = "Where the data comes from";

const NEEDS_ANOTHER_TILE = ["@core/from-tile-value", "@core/from-tile-rows", "@core/selected-row"];

export function sourcesOpenKey(key: string): string {
	return `prop:${key}${SOURCES_OPEN}`;
}

export function sourceButton(state: SettingsState, key: string, spec: SettingsSpec): ReactElement | null {
	if (spec.source) return null;
	const isOpen = state.openRow === sourcesOpenKey(key);
	return h(
		IconButton,
		{
			size: "s",
			key: "source",
			label: WHERE_FROM,
			className: "wg-set-pop-source",
			"aria-pressed": isOpen,
			onClick: () => state.openEditor(isOpen ? `prop:${key}` : sourcesOpenKey(key)),
		},
		h(Icon, { name: "database" }),
	);
}

export function sourceList(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const chosen = hostGatewayFor(spec, config)?.id;
	const rows = offeredSources(state, spec).map((entry) =>
		h(SidebarRow, {
			key: entry.id,
			as: "button",
			label: entry.title,
			sub: entry.description,
			selected: entry.id === chosen,
			onClick: () => pickSource(state, key, spec, config, entry),
		}),
	);
	return [note(WHERE_FROM), h(SidebarGroup, { className: "wg-set-sources", key: "sources" }, rows)];
}

function offeredSources(state: SettingsState, spec: SettingsSpec): GatewayMetadata[] {
	const othersOffer = offeredEntries(state.refs).some((entry) => entry.tile !== state.tile.id);
	return sourcesFor(spec).filter((entry) => othersOffer || !NEEDS_ANOTHER_TILE.includes(entry.id));
}

function pickSource(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	entry: GatewayMetadata,
): void {
	const { implementation: formerSource, fields, ...legacy } = config;
	const kind = SOURCE_KIND.get(entry.id);
	if (kind) {
		switchKind(state, key, spec, legacy, kind);
		return;
	}
	if (isFolderStat(entry.id)) {
		writeProp(state, key, spec, { ...legacy, from: STATISTICS, algorithm: entry.id.slice(STAT_SOURCE.length) });
		openStatStep(state, key, null);
		return;
	}
	const kept = formerSource === entry.id ? (fields ?? {}) : {};
	writeProp(state, key, spec, { implementation: entry.id, fields: kept });
	state.openEditor(`prop:${key}`);
}

// TRADE-OFF: the sources the host already drew an editor for keep their written shape, so a tile bound before still opens in the editor it was bound in
function switchKind(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp, kind: string): void {
	const typed = kind === TYPED_HERE;
	const typedBefore = typedIn(spec, config);
	const path = config.path === undefined && kind === IN_VAULT ? "" : config.path;
	const kept = withTyped(
		spec,
		{ ...config, from: kind, path },
		typedBefore === undefined && typed ? blankValue(spec) : typedBefore,
	);
	writeProp(state, key, spec, kept);
	state.openEditor(`prop:${key}`, typed ? writtenText(spec, typedIn(spec, kept)) : pathSeedOf(kept));
}

function pathSeedOf(config: TileProp): string | undefined {
	return typeof config.path === "string" ? config.path : undefined;
}
