import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { hostGatewayFor } from "../engine/host-gateways.js";
import type { HostFields } from "../engine/host-gateways.js";
import { isObject } from "../engine/is-object.js";
import { offeredEntries, refLabel } from "./offered-boxes.js";
import type { OfferedEntry } from "./offered-boxes.js";
import { writeProp } from "./prop-writing.js";
import type { SettingsProp } from "./prop-row.js";
import { note, pickRow } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";

const SCREEN_NOTE = "Nothing to fill in: the value lives while this screen is open and never reaches the note.";

const PICKED_FROM = "The list";

const PICKED_BY = "Who picks";

const WHILE_NOTHING_PICKED = "While nothing is picked";

const THIS_SCREEN = "This screen";

const FALLBACKS = [
	{ value: "first", label: "The first row" },
	{ value: "none", label: "Nothing" },
];

export function implementationBody(state: SettingsState, prop: SettingsProp): ReactElement[] {
	const { key, spec, config } = prop;
	if (config.implementation === "@core/selected-row") return selectedRowBody(state, key, spec, config);
	if (config.implementation === "@core/screen-state") return [note(SCREEN_NOTE)];
	return [];
}

export function implementationLabel(state: SettingsState, prop: SettingsProp): string {
	const { spec, config } = prop;
	const rows = sourceFieldsOf(config).rows;
	if (config.implementation === "@core/selected-row" && rows) return refLabel(state, rows);
	return hostGatewayFor(spec, config)?.title ?? String(config.implementation);
}

function sourceFieldsOf(config: TileProp): HostFields {
	return isObject(config.fields) ? config.fields : {};
}

function selectedRowBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const fields = sourceFieldsOf(config);
	const write = (next: HostFields): void => writeProp(state, key, spec, { ...config, fields: next });
	const { picked: formerPicker, ...unpicked } = fields;
	const others = offeredEntries(state.refs).filter((entry) => entry.tile !== state.tile.id);
	const named = (entry: OfferedEntry): string => `${entry.title} · ${entry.label}`;
	return [
		note(PICKED_FROM),
		...others
			.filter((entry) => entry.kind === "collection")
			.map((entry) =>
				pickRow(
					`rows:${entry.ref}`,
					named(entry),
					() => write({ ...fields, rows: entry.ref }),
					entry.ref === fields.rows,
				),
			),
		note(PICKED_BY),
		pickRow("picked:screen", THIS_SCREEN, () => write(unpicked), !formerPicker),
		...others
			.filter((entry) => entry.kind === "value")
			.map((entry) =>
				pickRow(
					`picked:${entry.ref}`,
					named(entry),
					() => write({ ...fields, picked: entry.ref }),
					entry.ref === formerPicker,
				),
			),
		note(WHILE_NOTHING_PICKED),
		h(Segmented, {
			key: "fallback",
			className: "wg-set-pop-kind",
			size: "s",
			items: FALLBACKS,
			value: fields.whenNothingPicked ?? "first",
			onChange: (next: string) => write({ ...fields, whenNothingPicked: next }),
		}),
	];
}
