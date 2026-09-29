import { createElement as h } from "react";
import { Button, Field, Icon } from "@widgetarium/kit";
import { ALGORITHMS_READING_A_FIELD, DEFAULT_DATE_FIELD } from "../gateway/stats.js";
import { STAT_TITLES } from "../engine/host-gateways.js";
import { OTHER_FIELD } from "./condition-steps.js";
import { STATISTICS, writeProp } from "./prop-writing.js";
import { note, pickRow, valueRow } from "./settings-rows.js";
import { FOLDERS_SHOWN, foldersOf } from "./vault-paths.js";

const WINDOW_LABELS = {
	all: "All time",
	today: "Today",
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	"90d": "Last 90 days",
	"365d": "Last 365 days",
	week: "This week",
	month: "This month",
	year: "This year",
};

const COMPARISON_LABELS = {
	none: "The number itself",
	change: "Change from the period before",
	"change-percent": "Change in percent",
};

const STAT_CONDITIONS_NOTE = "Which notes arrive, and which of them count, is set in the Data tab.";

const STAT_PROPERTY_NOTE = "Which property holds the number?";

const STAT_DATE_NOTE = "Which property holds the date? A list of dates counts every date in it.";

const STAT_STEP_NOTES = {
	algorithm: "What is counted?",
	window: "Over which period?",
	compare: "What does the widget show?",
	folder: "Which folder holds the notes?",
};

const STAT_STEPS = {
	folder: (state, key, spec, config) => folderStep(state, key, spec, config),
	field: (state, key, spec, config) => propertyStep(state, key, spec, config, "field"),
	date: (state, key, spec, config) => propertyStep(state, key, spec, config, "date"),
	window: (state, key, spec, config) => choiceStep(state, key, spec, config, "window", WINDOW_LABELS, "all"),
	compare: (state, key, spec, config) => choiceStep(state, key, spec, config, "compare", COMPARISON_LABELS, "none"),
};

export function statLabel(config) {
	const counted = STAT_TITLES[config.algorithm ?? "count"] ?? config.algorithm;
	return config.path ? `${counted} · ${config.path}` : counted;
}

export function statStepOf(openRow, key) {
	const head = `prop:${key}|`;
	return String(openRow ?? "").startsWith(head) ? String(openRow).slice(head.length) : null;
}

export function openStatStep(state, key, step) {
	state.openEditor(step ? `prop:${key}|${step}` : `prop:${key}`, "");
}

export function statBody(state, key, spec, config) {
	const step = STAT_STEPS[statStepOf(state.openRow, key)];
	return step ? step(state, key, spec, config) : statSummary(state, key, config);
}

function writeStat(state, key, spec, config, patch) {
	writeProp(state, key, spec, { ...config, from: STATISTICS, ...patch });
	openStatStep(state, key, null);
}

function backFoot(state, key, extra) {
	return h("div", { className: "wg-set-pop-foot", key: "foot" }, [
		h(Button, { size: "s", key: "back", onClick: () => openStatStep(state, key, null) }, "Back"),
		extra,
	]);
}

function choiceStep(state, key, spec, config, name, labels, fallback) {
	const held = config[name] ?? fallback;
	return [
		note(STAT_STEP_NOTES[name]),
		...Object.entries(labels).map(([value, label]) =>
			pickRow(value, label, () => writeStat(state, key, spec, config, { [name]: value }), value === held),
		),
		backFoot(state, key, null),
	];
}

function folderStep(state, key, spec, config) {
	const needle = String(state.draft ?? "").toLowerCase();
	const found = foldersOf(state.host)
		.filter((entry) => entry.toLowerCase().includes(needle))
		.slice(0, FOLDERS_SHOWN);
	return [
		note(STAT_STEP_NOTES.folder),
		h(Field, {
			block: true,
			key: "field",
			icon: h(Icon, { name: "search" }),
			value: state.draft ?? "",
			placeholder: "Folder in the vault",
			onInput: (event) => state.setDraft(event.target.value),
		}),
		...found.map((entry) =>
			pickRow(entry, entry, () => writeStat(state, key, spec, config, { path: entry }), entry === config.path),
		),
		backFoot(state, key, null),
	];
}

function propertyStep(state, key, spec, config, name) {
	const typed = String(state.draft ?? "").trim();
	const held = config[name] ?? (name === "date" ? DEFAULT_DATE_FIELD : "");
	const fields = state.vaultFields?.[config.path ?? ""] ?? [];
	const use = h(
		Button,
		{
			size: "s",
			variant: "accent",
			key: "use",
			disabled: typed === "",
			onClick: () => writeStat(state, key, spec, config, { [name]: typed }),
		},
		"Use it",
	);
	return [
		note(name === "date" ? STAT_DATE_NOTE : STAT_PROPERTY_NOTE),
		...fields.map((field) =>
			pickRow(
				field.prop,
				field.prop,
				() => writeStat(state, key, spec, config, { [name]: field.prop }),
				field.prop === held,
			),
		),
		h(Field, {
			block: true,
			key: "typed",
			value: state.draft ?? "",
			placeholder: OTHER_FIELD,
			onInput: (event) => state.setDraft(event.target.value),
		}),
		backFoot(state, key, use),
	];
}

function statSummary(state, key, config) {
	const row = (step, label, value) =>
		valueRow({
			key: step,
			label,
			value: h("span", { className: "wg-set-path" }, value),
			onClick: () => openStatStep(state, key, step),
		});
	const algorithm = config.algorithm ?? "count";
	return [
		row("folder", "Folder", config.path || "Pick a folder"),
		ALGORITHMS_READING_A_FIELD.includes(algorithm) ? row("field", "Property", config.field || "Pick one") : null,
		row("date", "Date", config.date || DEFAULT_DATE_FIELD),
		row("window", "Period", WINDOW_LABELS[config.window ?? "all"] ?? config.window),
		row("compare", "Shows", COMPARISON_LABELS[config.compare ?? "none"] ?? config.compare),
		note(STAT_CONDITIONS_NOTE),
	];
}
