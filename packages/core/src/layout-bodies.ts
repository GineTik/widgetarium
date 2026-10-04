import { ADAPTIVE, APART, COLUMN, DRAWER, NO_SURFACE, ROW, TEXT_ROLE } from "./tree.js";
import { beside, childrenOf, hole } from "./layout-regions.js";
import type { BaseBox, BaseNode, BaseText } from "./layout-regions.js";
import type { LayoutBase } from "./layout-bases.js";
import { isObject } from "./engine/is-object.js";

export interface SlotRule {
	readonly maxWidgets?: number;
	readonly isOptional?: boolean;
	readonly accepts?: readonly string[];
	readonly opensWithHeading?: boolean;
}

export interface LayoutBody extends LayoutBase {
	readonly slots: Readonly<Record<string, SlotRule>>;
	readonly hasShell: boolean;
}

type RoleOf = (id: unknown) => unknown;

export const SHELL_ZONES: readonly string[] = ["nav", "index", "aside", "dock"];

const SHELL_SLOTS: Readonly<Record<string, SlotRule>> = {
	nav: { isOptional: true, opensWithHeading: true, accepts: ["navigation", TEXT_ROLE] },
	index: { isOptional: true, opensWithHeading: true, accepts: ["navigation", TEXT_ROLE] },
	main: {},
	header: { maxWidgets: 4, accepts: [TEXT_ROLE, "control", "navigation"] },
	aside: { isOptional: true, opensWithHeading: true },
	dock: { isOptional: true, maxWidgets: 1, accepts: ["control", "media", "indicator", "composer"] },
};

interface BodyWords {
	readonly suits: string;
	readonly holds: string;
	readonly pageName: string;
}

export const BODIES: Readonly<Record<string, LayoutBody>> = {
	flow: bodyOf(
		{
			suits: "one page of sections read top to bottom",
			holds: "a subject hub, a daily note, an article, a timeline, settings",
			pageName: "The page",
		},
		{ hero: { maxWidgets: 1, isOptional: true }, stack: {} },
		[
			createSlot("hero", "detail", "The one block that presents the page, when it has one"),
			createSlot("stack", "collection", "Everything the page is for, stacked top to bottom"),
		],
	),

	dashboard: bodyOf(
		{
			suits: "numbers that matter together, with one of them leading",
			holds: "insights, progress, a review of a period",
			pageName: "What is measured",
		},
		{
			hero: { maxWidgets: 1, accepts: ["indicator", "indicators", "detail", TEXT_ROLE] },
			indicators: { maxWidgets: 1, accepts: ["indicator", "indicators"] },
			stack: {},
		},
		[
			{
				dir: ROW,
				name: "top",
				role: "indicators",
				purpose: "The leading number beside the others",
				surface: NO_SURFACE,
				of: [
					createSlot("hero", "indicator", "The one number or finding that leads"),
					createSlot("indicators", "indicators", "The few numbers beside it"),
				],
			},
			createSlot("stack", "collection", "Everything that explains the numbers, stacked below them"),
		],
	),

	"list-detail": bodyOf(
		{
			suits: "many items read one at a time",
			holds: "a journal by day, a vocabulary, an inbox, a day of time blocks",
			pageName: "The set",
		},
		{ list: {}, detail: {} },
		[
			{
				dir: ROW,
				name: "split",
				role: "collection",
				purpose: "The list beside the one item that is open",
				surface: NO_SURFACE,
				of: [
					{ ...createSlot("list", "collection", "Everything there is, and which one is open"), width: 340 },
					{
						dir: COLUMN,
						name: "detail",
						role: "detail",
						purpose: "The one item that is open",
						surface: NO_SURFACE,
						of: [captionBox("The item picked in the list opens here", "Said before an item is picked")],
					},
				],
			},
		],
	),

	collection: bodyOf(
		{
			suits: "many items worked on together, the collection itself is the screen",
			holds: "a task board, a writing pipeline, a table of sources, a graph of notes",
			pageName: "The collection",
		},
		{
			toolbar: { maxWidgets: 1, isOptional: true, accepts: ["control"] },
			view: { maxWidgets: 1 },
			sheet: { maxWidgets: 1, isOptional: true },
		},
		[
			createSlot("toolbar", "control", "How the collection is looked at: views, filters, grouping"),
			{
				dir: ROW,
				name: "work",
				role: "collection",
				purpose: "The collection, and the item opened beside it",
				surface: NO_SURFACE,
				of: [
					{ ...createSlot("view", "collection", "The whole collection in one view"), ratio: 3 },
					{ ...createSlot("sheet", "detail", "The item that is open, beside the collection"), ratio: 1 },
				],
			},
		],
	),

	conversation: bodyOf(
		{
			suits: "a conversation that scrolls, with the place to write pinned under it",
			holds: "an assistant chat, a comment thread, a log you answer",
			pageName: "The conversation",
		},
		{ thread: {}, composer: { maxWidgets: 3, accepts: ["composer", "control", "indicator"] } },
		[
			createSlot("thread", "collection", "The messages, oldest at the top"),
			createSlot("composer", "composer", "Where the next message is written, pinned to the bottom"),
		],
	),

	focus: {
		suits: "one thing filling the screen with nothing around it",
		holds: "a flashcard session, a reader, a distraction-free editor, a player",
		needsPx: 360,
		slots: { main: {}, content: { maxWidgets: 1 } },
		hasShell: false,
		layout: beside({
			dir: COLUMN,
			name: "main",
			keep: true,
			role: "detail",
			purpose: "The one thing in focus",
			of: [createSlot("content", "detail", "The single widget in focus")],
		}),
	},
};

export const BODY_NAMES: readonly string[] = Object.keys(BODIES);

export function isBody(said: unknown): boolean {
	return bodyNamed(said) !== null;
}

export function refuseZones(said: unknown, zones: readonly string[]): string | null {
	const unknownZone = zones.find((zone) => !SHELL_ZONES.includes(zone));
	if (unknownZone !== undefined)
		return `${unknownZone} is not a shell zone; the ones a body may add are ${SHELL_ZONES.join(", ")}.`;
	if (zones.length === 0 || bodyNamed(said)?.hasShell) return null;
	return `${String(said)} stands in no shell, so it takes no zones; leave out --with, or take a body that has one.`;
}

export function slotRulesOf(said: unknown): readonly [string, SlotRule][] {
	return Object.entries(bodyNamed(said)?.slots ?? {});
}

export function bodyLayoutWith(said: unknown, zones: readonly string[]): BaseBox | null {
	const body = bodyNamed(said);
	if (!body) return null;
	const dropped = new Set(SHELL_ZONES.filter((zone) => !zones.includes(zone)));
	return withoutNamed(body.layout, dropped);
}

export function bodySlotNamesOf(said: unknown): ReadonlySet<string> {
	return new Set(Object.keys(bodyNamed(said)?.slots ?? {}));
}

export function bodySlotProblems(said: unknown, root: unknown, roleOf: RoleOf = () => null): string[] {
	const body = bodyNamed(said);
	if (!body) return [];
	const childrenByName = new Map<string, (readonly unknown[])[]>();
	collectChildrenByBoxName(root, childrenByName);
	const isStarted = [...childrenByName.entries()].some(
		([name, [children]]) => name !== "main" && widgetCountIn(children ?? []) > 0,
	);
	return Object.entries(body.slots).flatMap(([name, rule]) => [
		...slotProblemsOf(name, rule, childrenByName.get(name) ?? [], isStarted),
		...roleProblemsOf(name, rule, childrenByName.get(name)?.[0] ?? [], roleOf),
		...headingProblemsOf(name, rule, childrenByName.get(name)?.[0] ?? [], roleOf),
	]);
}

function createSlot(name: string, role: string, purpose: string): BaseBox {
	return { ...hole(purpose, role), name };
}

function titleLine(said: string): BaseBox {
	const line: BaseText = { text: said, level: 1, tone: "value", surface: NO_SURFACE };
	return { dir: COLUMN, role: TEXT_ROLE, purpose: "The name of this page", surface: NO_SURFACE, of: [line] };
}

function captionBox(said: string, purpose: string): BaseBox {
	const line: BaseText = { text: said, level: 0, tone: "caption", surface: NO_SURFACE };
	return { dir: COLUMN, role: TEXT_ROLE, purpose, surface: NO_SURFACE, of: [line] };
}

function headerRow(pageName: string): BaseBox {
	return {
		dir: ROW,
		name: "header",
		role: "control",
		purpose: "One line: the page's name, then its controls. It stays pinned while the page scrolls",
		surface: NO_SURFACE,
		of: [titleLine(pageName)],
	};
}

function sideZone(name: string, role: string, purpose: string, width: number): BaseBox {
	return {
		dir: COLUMN,
		name,
		role,
		purpose,
		surface: APART,
		side: name === "aside" ? "start" : "end",
		width,
		collapse: { into: DRAWER, toggle: ADAPTIVE },
		of: [],
	};
}

function mainRegion(words: BodyWords, body: readonly BaseNode[]): BaseBox {
	return {
		dir: COLUMN,
		name: "main",
		keep: true,
		role: "collection",
		purpose: words.suits,
		of: [
			headerRow(words.pageName),
			...body,
			createSlot("dock", "control", "What keeps running across pages, pinned to the bottom"),
		],
	};
}

function bodyOf(words: BodyWords, slots: Readonly<Record<string, SlotRule>>, body: readonly BaseNode[]): LayoutBody {
	return {
		suits: words.suits,
		holds: words.holds,
		needsPx: 640,
		slots: { ...SHELL_SLOTS, ...slots },
		hasShell: true,
		layout: shellAround(mainRegion(words, body)),
	};
}

function shellAround(main: BaseBox): BaseBox {
	return beside(
		sideZone("nav", "navigation", "Where the person goes in the app, the same on every page", 240),
		sideZone("index", "navigation", "The siblings of this page, such as a tree of notes", 220),
		main,
		sideZone("aside", "indicators", "What is about the page, never part of it: measures, queue, metadata, links", 300),
	);
}

function bodyNamed(said: unknown): LayoutBody | null {
	const name = typeof said === "string" ? said.trim() : "";
	return Object.prototype.hasOwnProperty.call(BODIES, name) ? (BODIES[name] ?? null) : null;
}

function withoutNamed(box: BaseBox, dropped: ReadonlySet<string>): BaseBox {
	return {
		...box,
		of: box.of
			.filter((child) => !("of" in child) || !dropped.has(child.name ?? ""))
			.map((child) => ("of" in child ? withoutNamed(child, dropped) : child)),
	};
}

function slotProblemsOf(
	name: string,
	rule: SlotRule,
	standing: readonly (readonly unknown[])[],
	isStarted: boolean,
): string[] {
	const [children] = standing;
	if (standing.length > 1) return [`slot "${name}" appears ${standing.length} times: keep one box with that name`];
	if (children === undefined)
		return rule.isOptional ? [] : [`the body has no "${name}" slot: put it back, or take another body`];
	if (children.length === 0 && isStarted) return [stillEmptySaid(name, rule)];
	return overfullProblemsOf(name, rule, children);
}

function overfullProblemsOf(name: string, rule: SlotRule, children: readonly unknown[]): string[] {
	const widgetCount = widgetCountIn(children);
	if (rule.maxWidgets === undefined || widgetCount <= rule.maxWidgets) return [];
	return [
		`slot "${name}" holds ${widgetCount} widgets and takes ${rule.maxWidgets}: move the rest into a slot that takes them, or remove them`,
	];
}

function stillEmptySaid(name: string, rule: SlotRule): string {
	const way = rule.isOptional ? "delete it" : "take another body";
	return `slot "${name}" is still empty while the others hold widgets: fill it, or ${way}`;
}

function headingProblemsOf(name: string, rule: SlotRule, children: readonly unknown[], roleOf: RoleOf): string[] {
	if (!rule.opensWithHeading || widgetCountIn(children) === 0) return [];
	const [first] = children;
	const isHeading = isObject(first) && (first["role"] === TEXT_ROLE || roleOf(first["id"]) === TEXT_ROLE);
	if (isHeading) return [];
	return [
		`zone "${name}" holds widgets and no heading: open it with a text line saying what it holds, so the column reads as a place and not as leftovers`,
	];
}

function roleProblemsOf(name: string, rule: SlotRule, children: readonly unknown[], roleOf: RoleOf): string[] {
	const { accepts } = rule;
	if (!accepts) return [];
	return leafIdsIn(children).flatMap((id) => {
		const role = roleOf(id);
		if (typeof role !== "string" || accepts.includes(role)) return [];
		return [
			`tile "${String(id)}" is a ${role} widget and slot "${name}" takes ${accepts.join(", ")}: move it to a slot that takes it`,
		];
	});
}

function collectChildrenByBoxName(node: unknown, childrenByName: Map<string, (readonly unknown[])[]>): void {
	if (!isObject(node) || !Array.isArray(node["of"])) return;
	const name = node["name"];
	const children = childrenOf(node);
	if (typeof name === "string") childrenByName.set(name, [...(childrenByName.get(name) ?? []), children]);
	for (const child of children) collectChildrenByBoxName(child, childrenByName);
}

function leafIdsIn(children: readonly unknown[]): unknown[] {
	return children.flatMap((child) => {
		if (!isObject(child)) return [];
		return Array.isArray(child["of"]) ? leafIdsIn(childrenOf(child)) : [child["id"]];
	});
}

function widgetCountIn(children: readonly unknown[]): number {
	return children.reduce<number>((count, child) => count + widgetCountOf(child), 0);
}

function widgetCountOf(node: unknown): number {
	if (!isObject(node) || !Array.isArray(node["of"])) return 1;
	if (node["role"] === TEXT_ROLE) return 0;
	return widgetCountIn(childrenOf(node));
}
