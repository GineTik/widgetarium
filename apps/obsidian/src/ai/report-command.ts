import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { widgetKeyOf } from "@widgetarium/core/engine/widget-ref.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { lintBoard } from "@widgetarium/core/board-lint.js";
import { rawBoardOfNote } from "./board-note.js";
import { checkedWidget } from "./widget-checking.js";
import { actionProblemsOf } from "./action-wiring.js";
import type { FeatureAction, PlacedTile } from "./action-wiring.js";
import { cardIn } from "./entries.js";
import { specOfApp } from "./spec-command.js";
import type { Told } from "./shape-command.js";
import type { WidgetEntry } from "./widget-entry.js";

export interface ReportRow {
	readonly feature: string;
	readonly widget: string | null;
	readonly page: string | null;
	readonly note: string | null;
	readonly widgetProblems: readonly string[];
	readonly problems: readonly string[];
}

export interface ReportPlace {
	readonly vault: string;
	readonly installed: readonly WidgetEntry[];
	readonly surface: readonly string[];
}

const NO_WIDGET = "names no widget: write `widget: <id>` on the feature";
const NOT_HERE = "{widget} is not in this vault";
const CHECK_SAID = "check: {rules}";
const NO_PAGE = "names no page: write `page: <page name>` on the feature";
const UNKNOWN_PAGE = 'page "{page}" is not one of the spec\'s pages';
const NO_NOTE = 'page "{page}" names no note yet: write `note: <path>` on the page';
const NOT_PLACED = "{widget} is not on {note}";
const UNLINTED = "{note} does not lint: {first}";
const GATED_STAGES: readonly string[] = ["widgets", "pages"];
const STAGE_REFUSED =
	"The {stage} stage is not done until every kept feature below says ✓. Finish them, then say the stage again.";
const ALL_DONE = "Every kept feature is built, checked and placed.";
const SOME_LEFT = "{left} of {all} features are not done:";

export async function reportOfApp(place: ReportPlace, app: unknown): Promise<Told<ReportRow[]>> {
	const read = await specOfApp(place.vault, app);
	if (read.refusal !== undefined) return read;
	const rows: ReportRow[] = [];
	for (const feature of keptFeaturesOf(read.value)) rows.push(await rowOf(place, read.value, feature));
	return { value: rows, text: reportText(rows) };
}

export function isReportClean(rows: readonly ReportRow[]): boolean {
	return rows.every((row) => row.problems.length === 0);
}

export function refuseStage(stage: unknown, rows: readonly ReportRow[]): string | null {
	const isReady = stage === "pages" ? isReportClean(rows) : rows.every((row) => row.widgetProblems.length === 0);
	if (!GATED_STAGES.includes(String(stage)) || isReady) return null;
	return [STAGE_REFUSED.replace("{stage}", String(stage)), reportText(rows)].join("\n");
}

async function rowOf(place: ReportPlace, spec: AppSpec, feature: AppSpec["features"][number]): Promise<ReportRow> {
	const widget = feature.widget ?? null;
	const page = pageOf(spec, feature.page);
	const note = page?.note ?? null;
	const built = await widgetProblems(place, widget);
	const placed = [...pageProblems(feature.page ?? null, page, note), ...(await placedProblems(place, feature, note))];
	return {
		feature: feature.title,
		widget,
		page: feature.page ?? null,
		note,
		widgetProblems: built,
		problems: [...built, ...placed],
	};
}

function pageOf(spec: AppSpec, named: string | undefined): AppSpec["pages"][number] | null {
	return named ? (spec.pages.find((one) => one.name === named) ?? null) : null;
}

async function widgetProblems(place: ReportPlace, widget: string | null): Promise<string[]> {
	if (!widget) return [NO_WIDGET];
	const entry = place.installed.find((one) => one.id === widgetKeyOf(widget));
	if (!entry) return [NOT_HERE.replace("{widget}", widget)];
	const findings = await checkedWidget(entry, place.surface);
	return findings.length === 0 ? [] : [CHECK_SAID.replace("{rules}", findings.map((one) => one.rule).join(", "))];
}

function pageProblems(named: string | null, page: AppSpec["pages"][number] | null, note: string | null): string[] {
	if (!named) return [NO_PAGE];
	if (!page) return [UNKNOWN_PAGE.replace("{page}", named)];
	return note ? [] : [NO_NOTE.replace("{page}", named)];
}

async function placedProblems(
	place: ReportPlace,
	feature: AppSpec["features"][number],
	note: string | null,
): Promise<string[]> {
	if (!feature.widget || !note) return [];
	return placementProblems(place, { widget: feature.widget, note, actions: feature.actions });
}

interface Placement {
	readonly widget: string;
	readonly note: string;
	readonly actions: readonly FeatureAction[];
}

async function placementProblems(place: ReportPlace, { widget, note, actions }: Placement): Promise<string[]> {
	const raw = await rawBoardOfNote(place.vault, note);
	const tiles = isObject(raw) && Array.isArray(raw["tiles"]) ? raw["tiles"] : [];
	const tile = tiles.find((one) => isObject(one) && widgetKeyOf(textOf(one["widget"])) === widgetKeyOf(widget));
	const wiring = tile === undefined ? [] : await wiringProblems(place, { widget, tiles, tile, actions });
	return [
		...(tile === undefined ? [NOT_PLACED.replace("{widget}", widget).replace("{note}", note)] : []),
		...wiring,
		...lintProblems(place, raw, note),
	];
}

interface Wiring {
	readonly widget: string;
	readonly tiles: readonly unknown[];
	readonly tile: unknown;
	readonly actions: readonly FeatureAction[];
}

async function wiringProblems(place: ReportPlace, { widget, tiles, tile, actions }: Wiring): Promise<string[]> {
	const entry = place.installed.find((one) => one.id === widgetKeyOf(widget));
	if (!entry) return [];
	const feature = { tile, card: await cardIn(entry.folder) };
	return actionProblemsOf(widget, feature, await othersOn(place, tiles, tile), actions);
}

function lintProblems(place: ReportPlace, raw: unknown, note: string): string[] {
	const roleOf = (id: unknown): string | null =>
		place.installed.find((one) => one.id === widgetKeyOf(textOf(id)))?.role ?? null;
	const [first] = raw === null ? [] : lintBoard(raw, roleOf);
	return first ? [UNLINTED.replace("{note}", note).replace("{first}", first.message)] : [];
}

function heldIn(tile: unknown): unknown[] {
	const mounted = isObject(tile) && isObject(tile["mounted"]) ? Object.values(tile["mounted"]) : [];
	return [tile, ...mounted.flatMap(heldIn)];
}

async function othersOn(place: ReportPlace, tiles: readonly unknown[], feature: unknown): Promise<PlacedTile[]> {
	const others = tiles.flatMap(heldIn).filter((one) => one !== feature);
	return Promise.all(
		others.map(async (tile) => {
			const entry = place.installed.find((one) => isObject(tile) && one.id === widgetKeyOf(textOf(tile["widget"])));
			return { tile, card: entry ? await cardIn(entry.folder) : null };
		}),
	);
}

function reportText(rows: readonly ReportRow[]): string {
	const left = rows.filter((row) => row.problems.length > 0);
	const head =
		left.length === 0
			? ALL_DONE
			: SOME_LEFT.replace("{left}", String(left.length)).replace("{all}", String(rows.length));
	return [head, ...rows.map(rowText)].join("\n");
}

function rowText(row: ReportRow): string {
	const where = row.widget && row.note ? ` — ${row.widget} on ${row.note}` : "";
	if (row.problems.length === 0) return `  ✓ ${row.feature}${where}`;
	return [`  ✗ ${row.feature}${where}`, ...row.problems.map((problem) => `      ${problem}`)].join("\n");
}

function textOf(held: unknown): string | null {
	return typeof held === "string" ? held : null;
}
