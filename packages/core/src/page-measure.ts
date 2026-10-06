export interface MeasuredFinding {
	readonly rule: string;
	readonly frame: string;
	readonly said: string;
}

export const MEASURED_RULES = ["PG5", "S2", "S4", "R3", "C1", "C2", "C4", "C5", "C6"] as const;

const FRAME = ".wg-design-frame";
const FRAME_NAME = ".wg-design-name";
const LIST = ".wg-kit-list, .wg-kit-layout.is-rows, .wg-kit-slot-list, .wg-kit-data-table, .wg-kit-table";
const ROW = ".wg-kit-row, .wg-kit-layout-item, .wg-kit-table-row, li";
const BADGE = ".wg-kit-pill, .wg-kit-row-badge";
const NOT_A_LIST =
	".wg-kit-hero, .wg-kit-page-hero, .wg-kit-chart, .wg-kit-shape, .wg-kit-art-field, .wg-kit-photo-card, .wg-kit-photo-stack, .wg-kit-empty, .wg-kit-layout.is-grid, img";
const HEADER = ".wg-kit-section-head, .wg-kit-page-head, .wg-kit-layout-head";
const MOST_SECTIONS = 5;
const MOST_OVERVIEW_ROWS = 5;
const MOST_STACKED_LISTS = 2;
const MOST_BIG = 2;
const BIG_TIMES_BODY = 2.5;
const MOST_CHARACTERS_PER_LINE = 75;
const CHARACTER_EM = 0.5;
const SAME_COLUMN_PX = 4;

const SAID = {
	PG5: "{count} sections on one page; a sixth means the page is two pages",
	S2: '"{label}" stands below a list; it belongs in the section header',
	S4: "an overview section shows {count} rows; show 5 and a See all",
	R3: '"{label}" is on {count} of {total} rows; a badge is for the exception, sort instead',
	C1: "the page is lists alone; add a hero, a key number on an object, a chart, cards or photos",
	C2: "{count} lists stacked in one column; put them side by side or in tabs",
	C4: "{count} big elements; keep one focal point, at most 2",
	C5: "a line of text {count} characters long; keep text at most 75 per line",
	C6: "{count} empty states; an empty page shows one",
};

type MeasuredRule = keyof typeof SAID;

export function measuredFindingsIn(root: ParentNode): MeasuredFinding[] {
	return [...root.querySelectorAll(FRAME)].flatMap((frame) => {
		const name = frame.querySelector(FRAME_NAME)?.textContent?.trim() ?? "";
		return frameFindings(frame).map((found) => ({ ...found, frame: name }));
	});
}

interface Found {
	readonly rule: MeasuredRule;
	readonly said: string;
}

function frameFindings(frame: Element): Found[] {
	return [
		...sectionCountFindings(frame),
		...buttonBelowListFindings(frame),
		...overviewRowFindings(frame),
		...badgeFindings(frame),
		...listsAloneFindings(frame),
		...stackedListFindings(frame),
		...bigFindings(frame),
		...measureFindings(frame),
		...emptyStateFindings(frame),
	];
}

function found(rule: MeasuredRule, values: Readonly<Record<string, string | number>>): Found {
	const said = Object.entries(values).reduce(
		(text, [key, value]) => text.replace(`{${key}}`, String(value)),
		SAID[rule],
	);
	return { rule, said };
}

function sectionCountFindings(frame: Element): Found[] {
	const count = frame.querySelectorAll("[data-wg-section]").length;
	return count > MOST_SECTIONS ? [found("PG5", { count })] : [];
}

function buttonBelowListFindings(frame: Element): Found[] {
	return [...frame.querySelectorAll(".wg-kit-btn")]
		.filter((button) => !button.closest(HEADER) && isListAbove(button))
		.map((button) => found("S2", { label: button.textContent?.trim() ?? "" }));
}

function isListAbove(button: Element): boolean {
	const above = button.previousElementSibling;
	return Boolean(above && (above.matches(LIST) || above.querySelector(LIST)));
}

function overviewRowFindings(frame: Element): Found[] {
	return [...frame.querySelectorAll('[data-wg-page="home"] [data-wg-section]')]
		.map((section) => section.querySelectorAll(ROW).length)
		.filter((count) => count > MOST_OVERVIEW_ROWS)
		.map((count) => found("S4", { count }));
}

function badgeFindings(frame: Element): Found[] {
	return outermost(frame, LIST).flatMap((list) => {
		const rows = [...list.querySelectorAll(ROW)];
		const [label, count] = commonestBadge(rows);
		if (rows.length < 3 || count * 3 <= rows.length) return [];
		return [found("R3", { label, count, total: rows.length })];
	});
}

function commonestBadge(rows: readonly Element[]): [string, number] {
	const counts = new Map<string, number>();
	for (const row of rows) {
		const label = row.querySelector(BADGE)?.textContent?.trim();
		if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
}

function listsAloneFindings(frame: Element): Found[] {
	const hasList = frame.querySelector(LIST) !== null;
	return hasList && frame.querySelector(NOT_A_LIST) === null ? [found("C1", {})] : [];
}

function stackedListFindings(frame: Element): Found[] {
	const columns = new Map<number, number>();
	for (const list of outermost(frame, LIST)) {
		const left = Math.round(list.getBoundingClientRect().left / SAME_COLUMN_PX);
		columns.set(left, (columns.get(left) ?? 0) + 1);
	}
	const count = Math.max(0, ...columns.values());
	return count > MOST_STACKED_LISTS ? [found("C2", { count })] : [];
}

function bigFindings(frame: Element): Found[] {
	const body = fontPx(frame);
	const big = [...frame.querySelectorAll(".wg-kit-hero, h1, h2, b, strong, span")].filter(
		(node) => node.matches(".wg-kit-hero") || (hasOwnText(node) && fontPx(node) >= body * BIG_TIMES_BODY),
	);
	const count = outermostOf(big).length;
	return count > MOST_BIG ? [found("C4", { count })] : [];
}

function measureFindings(frame: Element): Found[] {
	const longest = Math.max(
		0,
		...[...frame.querySelectorAll("p, span, div")]
			.filter((node) => hasOwnText(node) && (node.textContent?.length ?? 0) > MOST_CHARACTERS_PER_LINE)
			.map((node) => Math.round(node.getBoundingClientRect().width / (fontPx(node) * CHARACTER_EM))),
	);
	return longest > MOST_CHARACTERS_PER_LINE ? [found("C5", { count: longest })] : [];
}

function emptyStateFindings(frame: Element): Found[] {
	const count = frame.querySelectorAll(".wg-kit-empty").length;
	return count > 1 ? [found("C6", { count })] : [];
}

function outermost(frame: Element, selector: string): Element[] {
	return outermostOf([...frame.querySelectorAll(selector)]);
}

function outermostOf(nodes: readonly Element[]): Element[] {
	return nodes.filter((node) => !nodes.some((other) => other !== node && other.contains(node)));
}

function hasOwnText(node: Element): boolean {
	return [...node.childNodes].some((child) => child.nodeType === 3 && (child.textContent?.trim() ?? "") !== "");
}

function fontPx(node: Element): number {
	const px = Number.parseFloat(node.ownerDocument.defaultView?.getComputedStyle(node).fontSize ?? "");
	return Number.isFinite(px) && px > 0 ? px : 16;
}
