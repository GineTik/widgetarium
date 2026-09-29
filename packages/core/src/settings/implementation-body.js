import { createElement as h } from "react";
import { Segmented } from "@widgetarium/kit";
import { hostGatewayFor } from "../engine/host-gateways.js";
import { refLabel } from "./offered-boxes.js";
import { writeProp } from "./prop-writing.js";
import { note, pickRow } from "./settings-rows.js";

const SCREEN_NOTE = "Nothing to fill in: the value lives while this screen is open and never reaches the note.";

const PICKED_FROM = "The list";

const PICKED_BY = "Who picks";

const WHILE_NOTHING_PICKED = "While nothing is picked";

const THIS_SCREEN = "This screen";

const FALLBACKS = [
	{ value: "first", label: "The first row" },
	{ value: "none", label: "Nothing" },
];

export function implementationBody(state, prop) {
	const { key, spec, config } = prop;
	if (config.implementation === "@core/selected-row") return selectedRowBody(state, key, spec, config);
	if (config.implementation === "@core/screen-state") return [note(SCREEN_NOTE)];
	return [];
}

export function implementationLabel(state, prop) {
	const { spec, config } = prop;
	const chosen = hostGatewayFor(spec, config);
	const rows = config.fields?.rows;
	if (config.implementation === "@core/selected-row" && rows) return refLabel(state, rows);
	return chosen?.title ?? String(config.implementation);
}

function selectedRowBody(state, key, spec, config) {
	const fields = config.fields ?? {};
	const write = (next) => writeProp(state, key, spec, { ...config, fields: next });
	const { picked: formerPicker, ...unpicked } = fields;
	const others = (state.refs?.offered?.() ?? []).filter((entry) => entry.tile !== state.tile.id);
	const named = (entry) => `${entry.title} · ${entry.label}`;
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
			onChange: (next) => write({ ...fields, whenNothingPicked: next }),
		}),
	];
}
