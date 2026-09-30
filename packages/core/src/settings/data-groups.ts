import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { allowedVerbs, bindingOf } from "../gateway/props.js";
import type { PropBinding } from "../gateway/props.js";
import { sortRowsIn } from "../engine/host-gateways.js";
import { propConfigOf, writeProp } from "./prop-writing.js";
import { group, reportRow, titleCase } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { whereGroup } from "./where-group.js";

const VERBS_SWITCHED_HERE = "Switch one off and this tile can no longer do it, whatever the widget asks for.";

const ONE_EMPTY_FIELD = "One empty field turns the rows grey.";

interface DataProp {
	readonly key: string;
	readonly spec: SettingsSpec;
	readonly config: TileProp;
	readonly label: string;
	readonly binding: PropBinding;
}

export function dataGroups(state: SettingsState): ReactElement[] {
	const groups = Object.entries(state.manifest.props ?? {}).flatMap(([key, spec]) =>
		propDataGroups(state, dataPropOf(state, key, spec)),
	);
	if (groups.length > 0) return groups;
	return [
		group(
			"no-data",
			"Data",
			h(Row, { className: "wg-set-row" }, h(RowLabel, null, "This widget declares no source")),
			null,
		),
	];
}

function dataPropOf(state: SettingsState, key: string, spec: SettingsSpec): DataProp {
	const config = propConfigOf(state, key, spec);
	return { key, spec, config, label: spec.label ?? key, binding: bindingOf(spec, config).binding };
}

function propDataGroups(state: SettingsState, prop: DataProp): ReactElement[] {
	const { key, spec, config, binding } = prop;
	const groups: ReactElement[] = [];
	if (spec.kind !== "value" && !spec.source) groups.push(whereGroup(state, key, spec, config));
	if (binding === "stat")
		groups.push(whereGroup(state, key, spec, config), whereGroup(state, key, spec, config, "counts"));
	const sorted = sortGroup(prop);
	if (sorted) groups.push(sorted);
	groups.push(verbsGroup(state, prop));
	return groups;
}

function sortGroup({ key, spec, config, label }: DataProp): ReactElement | null {
	const sort = [...(spec.sort ?? []), ...sortRowsIn(config.sort)];
	if (sort.length === 0) return null;
	return group(
		`sort:${key}`,
		`Sort · ${label}`,
		sort.map((row, index) =>
			h(Row, { className: "wg-set-row", key: index }, [
				h(RowLabel, { key: "label" }, row.prop),
				h(RowValue, { className: "wg-set-value", key: "value" }, row.dir === "desc" ? "Descending" : "Ascending"),
			]),
		),
		null,
	);
}

function verbsGroup(state: SettingsState, prop: DataProp): ReactElement {
	const { key, spec, config, label, binding } = prop;
	const isHardcoded = binding === "hardcode";
	const path = String(config.path || spec.default?.path || "");
	const isOn = isHardcoded || Boolean(path);
	const decisions = allowedVerbs(spec, config, binding);
	const verbsSwitchedOn = decisions.filter((decision) => decision.can).map((decision) => decision.verb);
	const flipVerb =
		(verb: string) =>
		(next: boolean): void =>
			writeProp(state, key, spec, {
				...config,
				allow: next ? [...new Set([...verbsSwitchedOn, verb])] : verbsSwitchedOn.filter((held) => held !== verb),
			});
	const said = verbSayings(isHardcoded, path);
	return group(
		`can:${key}`,
		`What ${label} can do`,
		decisions.map(({ verb, can }) =>
			reportRow(
				verb,
				titleCase(verb),
				said.get(verb) ?? `runs "${verb}" on this source`,
				h(Switch, { checked: can && isOn, label: titleCase(verb), onChange: flipVerb(verb) }),
				can && isOn,
			),
		),
		isOn ? VERBS_SWITCHED_HERE : ONE_EMPTY_FIELD,
	);
}

function verbSayings(isHardcoded: boolean, path: string): ReadonlyMap<string, string> {
	const folder = path || "nowhere";
	return new Map([
		["list", isHardcoded ? "reads this widget's own list" : `reads the notes in ${folder}`],
		["get", "reads one record"],
		["create", isHardcoded ? "adds a row to this widget's own list" : `a new note lands in ${folder}`],
		[
			"update",
			isHardcoded ? "rewrites a row in this widget's own list" : "writes frontmatter on the note it came from",
		],
		["remove", isHardcoded ? "drops a row from this widget's own list" : "moves the note to the vault's trash"],
	]);
}
