import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { ChoiceList } from "./choice-list.js";
import type { TileProp } from "../model.js";
import { bindingOf, typedIn, withFields, withTyped } from "../gateway/props.js";
import { hostGatewayFor, sourcesFor } from "../engine/host-gateways.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { offeredEntries } from "./offered-boxes.js";
import { blankValue, writeProp, writtenText } from "./prop-writing.js";
import { note } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { openStatStep } from "./stat-body.js";
import { boundPath } from "./vault-paths.js";

interface Picking {
	readonly key: string;
	readonly spec: SettingsSpec;
	readonly config: TileProp;
}

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
	const choices = offeredSources(state, spec).map((entry) => ({
		id: entry.id,
		title: entry.title,
		section: entry.resource,
		said: entry.description,
		selected: entry.id === chosen,
		onPick: () => pickSource(state, { key, spec, config }, entry.id),
	}));
	return [note(WHERE_FROM), h(ChoiceList, { key: "sources", choices })];
}

function offeredSources(state: SettingsState, spec: SettingsSpec): GatewayMetadata[] {
	const othersOffer = offeredEntries(state.refs).some((entry) => entry.tile !== state.tile.id);
	return sourcesFor(spec).filter((entry) => othersOffer || !NEEDS_ANOTHER_TILE.includes(entry.id));
}

function pickSource(state: SettingsState, picking: Picking, implementation: string): void {
	const { key, spec, config } = picking;
	const { binding } = bindingOf(spec, { implementation });
	if (binding === "hardcode") {
		pickTyped(state, picking);
		return;
	}
	writeProp(state, key, spec, withFields(config, implementation, {}));
	if (binding === "stat") openStatStep(state, key, null);
	else state.openEditor(`prop:${key}`, binding === "vault" ? boundPath(config) : undefined);
}

function pickTyped(state: SettingsState, { key, spec, config }: Picking): void {
	const typed = withTyped(spec, config, typedIn(spec, config) ?? blankValue(spec));
	writeProp(state, key, spec, typed);
	state.openEditor(`prop:${key}`, writtenText(spec, typedIn(spec, typed)));
}
