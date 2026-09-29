import { createElement as h } from "react";
import { Row, RowLabel, RowValue, Switch } from "@widgetarium/kit";
import { allowedVerbs, bindingOf } from "../gateway/props.js";
import { propConfigOf, writeProp } from "./prop-writing.js";
import { group, reportRow, titleCase } from "./settings-rows.js";
import { whereGroup } from "./where-group.js";

const VERBS_SWITCHED_HERE = "Switch one off and this tile can no longer do it, whatever the widget asks for.";

export function dataGroups(state) {
	const { manifest } = state;
	const groups = [];

	for (const [key, spec] of Object.entries(manifest.props ?? {})) {
		const config = propConfigOf(state, key, spec);
		const label = spec.label ?? key;
		const declared = spec.default ?? {};

		const binding = bindingOf(spec, config).binding;
		if (spec.kind !== "value" && !spec.source) groups.push(whereGroup(state, key, spec, config));
		if (binding === "stat")
			groups.push(whereGroup(state, key, spec, config), whereGroup(state, key, spec, config, "counts"));

		const sort = [...(spec.sort ?? []), ...(config.sort ?? [])];
		if (sort.length > 0) {
			groups.push(
				group(
					`sort:${key}`,
					`Sort · ${label}`,
					sort.map((row, index) =>
						h(Row, { className: "wg-set-row", key: index }, [
							h(RowLabel, { key: "label" }, row.prop),
							h(RowValue, { className: "wg-set-value", key: "value" }, row.dir === "desc" ? "Descending" : "Ascending"),
						]),
					),
					null,
				),
			);
		}

		const isHardcoded = binding === "hardcode";
		const path = config.path || declared.path || "";
		const isOn = isHardcoded || Boolean(path);
		const decisions = allowedVerbs(spec, config, binding);
		const verbsSwitchedOn = decisions.filter((decision) => decision.can).map((decision) => decision.verb);
		const flipVerb = (verb) => (next) =>
			writeProp(state, key, spec, {
				...config,
				allow: next ? [...new Set([...verbsSwitchedOn, verb])] : verbsSwitchedOn.filter((held) => held !== verb),
			});
		const said = {
			list: isHardcoded ? "reads this widget's own list" : `reads the notes in ${path || "nowhere"}`,
			get: "reads one record",
			create: isHardcoded ? "adds a row to this widget's own list" : `a new note lands in ${path || "nowhere"}`,
			update: isHardcoded ? "rewrites a row in this widget's own list" : "writes frontmatter on the note it came from",
			remove: isHardcoded ? "drops a row from this widget's own list" : "moves the note to the vault's trash",
		};
		groups.push(
			group(
				`can:${key}`,
				`What ${label} can do`,
				decisions.map(({ verb, can }) =>
					reportRow(
						verb,
						titleCase(verb),
						said[verb] ?? `runs "${verb}" on this source`,
						h(Switch, { checked: can && isOn, label: titleCase(verb), onChange: flipVerb(verb) }),
						can && isOn,
					),
				),
				isOn ? VERBS_SWITCHED_HERE : "One empty field turns the rows grey.",
			),
		);
	}

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
