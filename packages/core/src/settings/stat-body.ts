import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Button, Field, Icon } from "@widgetarium/kit";
import type { TileProp } from "../model.js";
import { ALGORITHMS_READING_A_FIELD, DEFAULT_DATE_FIELD } from "../engine/stat-fields.js";
import { hostGatewayFor } from "../engine/host-gateways.js";
import { textIn } from "../engine/held-text.js";
import { OTHER_FIELD } from "./condition-steps.js";
import { writeProp } from "./prop-writing.js";
import { fieldsIn, implementationOf, withFields } from "../gateway/props.js";
import { draftOnInput, note, pickRow, useItButton, valueRow } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { FOLDERS_SHOWN, boundPath, foldersOf } from "./vault-paths.js";

type StatStep = (state: SettingsState, key: string, spec: SettingsSpec, config: TileProp) => ReactNode[];

type StatChoice = "window" | "compare";

interface StatShown {
	readonly folder: string;
	readonly field: string | null;
	readonly date: string;
	readonly window: string;
	readonly compare: string;
}

interface StatAt {
	readonly key: string;
	readonly spec: SettingsSpec;
	readonly config: TileProp;
}

const STATISTICS_PACK = "@stats/";

type StatProperty = "field" | "date";

const WINDOW_LABELS: Readonly<Record<string, string>> = {
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

const COMPARISON_LABELS: Readonly<Record<string, string>> = {
	none: "The number itself",
	change: "Change from the period before",
	"change-percent": "Change in percent",
};

const STAT_CONDITIONS_NOTE = "Which notes arrive, and which of them count, is set in the Data tab.";

const STAT_PROPERTY_NOTE = "Which property holds the number?";

const STAT_DATE_NOTE = "Which property holds the date? A list of dates counts every date in it.";

const STAT_STEP_NOTES: Readonly<Record<StatChoice | "folder", string>> = {
	window: "Over which period?",
	compare: "What does the widget show?",
	folder: "Which folder holds the notes?",
};

const STAT_STEPS: ReadonlyMap<string, StatStep> = new Map<string, StatStep>([
	["folder", (state, key, spec, config) => folderStep(state, key, spec, config)],
	["field", (state, key, spec, config) => propertyStep(state, key, spec, config, "field")],
	["date", (state, key, spec, config) => propertyStep(state, key, spec, config, "date")],
	["window", (state, key, spec, config) => choiceStep(state, key, spec, config, "window", WINDOW_LABELS, "all")],
	["compare", (state, key, spec, config) => choiceStep(state, key, spec, config, "compare", COMPARISON_LABELS, "none")],
]);

export function statLabel(config: TileProp): string {
	const counted = hostGatewayFor(null, config)?.title ?? algorithmOf(config);
	const path = boundPath(config);
	return path ? `${counted} · ${path}` : counted;
}

export function statStepOf(openRow: string | null, key: string): string | null {
	const head = `prop:${key}|`;
	return String(openRow ?? "").startsWith(head) ? String(openRow).slice(head.length) : null;
}

export function openStatStep(state: Pick<SettingsState, "openEditor">, key: string, step: string | null): void {
	state.openEditor(step ? `prop:${key}|${step}` : `prop:${key}`, "");
}

export function statBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactNode[] {
	const step = STAT_STEPS.get(statStepOf(state.openRow, key) ?? "");
	return step ? step(state, key, spec, config) : statSummary(state, key, config);
}

function algorithmOf(config: TileProp): string {
	return textIn(config.implementation).slice(STATISTICS_PACK.length);
}

function writeStat(state: SettingsState, { key, spec, config }: StatAt, patch: Readonly<Record<string, string>>): void {
	writeProp(state, key, spec, withFields(config, implementationOf(spec, config), patch));
	openStatStep(state, key, null);
}

function backFoot(state: SettingsState, key: string, extra: ReactNode): ReactElement {
	return h("div", { className: "wg-set-pop-foot", key: "foot" }, [
		h(Button, { size: "s", key: "back", onClick: () => openStatStep(state, key, null) }, "Back"),
		extra,
	]);
}

function choiceStep(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	name: StatChoice,
	labels: Readonly<Record<string, string>>,
	fallback: string,
): ReactNode[] {
	const held = fieldsIn(config.fields)[name] ?? fallback;
	return [
		note(STAT_STEP_NOTES[name]),
		...Object.entries(labels).map(([value, label]) =>
			pickRow(value, label, () => writeStat(state, { key, spec, config }, { [name]: value }), value === held),
		),
		backFoot(state, key, null),
	];
}

function folderStep(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactNode[] {
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
			onInput: draftOnInput(state),
		}),
		...found.map((entry) =>
			pickRow(
				entry,
				entry,
				() => writeStat(state, { key, spec, config }, { path: entry }),
				entry === boundPath(config),
			),
		),
		backFoot(state, key, null),
	];
}

function propertyStep(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	name: StatProperty,
): ReactNode[] {
	const typed = String(state.draft ?? "").trim();
	const held = fieldsIn(config.fields)[name] ?? (name === "date" ? DEFAULT_DATE_FIELD : "");
	const fields = state.vaultFields?.[boundPath(config)] ?? [];
	return [
		note(name === "date" ? STAT_DATE_NOTE : STAT_PROPERTY_NOTE),
		...fields.map((field) =>
			pickRow(
				field.prop,
				field.prop,
				() => writeStat(state, { key, spec, config }, { [name]: field.prop }),
				field.prop === held,
			),
		),
		h(Field, {
			block: true,
			key: "typed",
			value: state.draft ?? "",
			placeholder: OTHER_FIELD,
			onInput: draftOnInput(state),
		}),
		backFoot(
			state,
			key,
			useItButton(typed === "", () => writeStat(state, { key, spec, config }, { [name]: typed })),
		),
	];
}

function statSummary(state: SettingsState, key: string, config: TileProp): ReactNode[] {
	const row = (step: string, label: string, value: ReactNode): ReactElement =>
		valueRow({
			key: step,
			label,
			value: h("span", { className: "wg-set-path" }, value),
			onClick: () => openStatStep(state, key, step),
		});
	const shown = statShownOf(config);
	return [
		row("folder", "Folder", shown.folder),
		shown.field === null ? null : row("field", "Property", shown.field),
		row("date", "Date", shown.date),
		row("window", "Period", shown.window),
		row("compare", "Shows", shown.compare),
		note(STAT_CONDITIONS_NOTE),
	];
}

function statShownOf(config: TileProp): StatShown {
	const fields = fieldsIn(config.fields);
	return {
		folder: boundPath(config) || "Pick a folder",
		field: readsAField(config) ? textIn(fields["field"]) || "Pick one" : null,
		date: textIn(fields["date"]) || DEFAULT_DATE_FIELD,
		window: labelIn(WINDOW_LABELS, fields["window"], "all"),
		compare: labelIn(COMPARISON_LABELS, fields["compare"], "none"),
	};
}

function labelIn(labels: Readonly<Record<string, string>>, held: unknown, fallback: string): string {
	const word = textIn(held) || fallback;
	return labels[word] ?? word;
}

function readsAField(config: TileProp): boolean {
	const algorithm = algorithmOf(config);
	return ALGORITHMS_READING_A_FIELD.some((reading) => reading === algorithm);
}
