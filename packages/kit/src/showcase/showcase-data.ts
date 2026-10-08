import type { ChartConfig } from "../charts/index";
import type { SkeletonKind, SkeletonProps, ToneName } from "../index";

export interface ShowcaseStatus {
	readonly label: string;
	readonly tone: ToneName;
}

export interface ShowcaseChoice {
	readonly value: string;
	readonly label: string;
}

export type Invoice = {
	readonly id: string;
	readonly client: string;
	readonly status: ShowcaseStatus;
	readonly issued: string;
	readonly due: string;
	readonly owner: string;
	readonly project: string;
	readonly amount: number;
};

export interface ShownSkeleton {
	readonly kind: SkeletonKind;
	readonly props?: SkeletonProps;
}

export const MONTHS = [
	{ month: "Jan", notes: 186, links: 80 },
	{ month: "Feb", notes: 305, links: 200 },
	{ month: "Mar", notes: 237, links: 120 },
	{ month: "Apr", notes: 73, links: 190 },
	{ month: "May", notes: 209, links: 130 },
	{ month: "Jun", notes: 214, links: 140 },
];

export const SERIES: ChartConfig = { notes: { label: "Notes" }, links: { label: "Links" } };

export const AREAS = [
	{ area: "work", hours: 21, fill: "var(--color-work)" },
	{ area: "learning", hours: 11, fill: "var(--color-learning)" },
	{ area: "health", hours: 9, fill: "var(--color-health)" },
	{ area: "home", hours: 9, fill: "var(--color-home)" },
];

export const AREA_CONFIG: ChartConfig = {
	hours: { label: "Hours" },
	work: { label: "Work", color: 1 },
	learning: { label: "Learning", color: 2 },
	health: { label: "Health", color: 3 },
	home: { label: "Home", color: 4 },
};

export const CHART_MARGIN = { top: 8, right: 12, left: 12, bottom: 0 };

export const WEEKS = [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27];

const CLIENTS = [
	"Halden & Co",
	"Northwind Studio",
	"Juniper Books",
	"Kettle Labs",
	"Mira Okafor",
	"Brightline Health",
	"Hawthorne Dental",
	"Brigham & Sons",
];

const PAID: ShowcaseStatus = { label: "Paid", tone: "success" };

export const STATUSES: readonly ShowcaseStatus[] = [
	PAID,
	{ label: "Sent", tone: "info" },
	{ label: "Overdue", tone: "error" },
	{ label: "Draft", tone: "neutral" },
];

const OWNERS = ["Ana", "Ben", "Chen", "Dara"];
const PROJECTS = ["Website", "Retainer", "Audit", "Launch", "Support"];

export const INVOICES: readonly Invoice[] = Array.from({ length: 48 }, (_, at): Invoice => ({
	id: `INV-2026-${String(at + 1).padStart(3, "0")}`,
	client: CLIENTS[at % CLIENTS.length] ?? "",
	status: STATUSES[at % STATUSES.length] ?? PAID,
	issued: `${1 + ((at * 7) % 28)} Aug`,
	due: `${1 + ((at * 11) % 28)} Sep`,
	owner: OWNERS[at % OWNERS.length] ?? "",
	project: PROJECTS[at % PROJECTS.length] ?? "",
	amount: 300 + ((at * 137) % 4000),
}));

export const COLUMNS = ["Invoice", "Client", "Status", "Issued", "Due", "Owner", "Project", "Amount"];

export const ROWS_PER_PAGE = 6;

export const CAPTION = "Sample invoices, {count} rows, {per} a page.";

export const NARROW_CAPTION = "The same table in a 340px region scrolls sideways, and the pages drop their words.";

export const STATUS_ITEMS: readonly ShowcaseChoice[] = [
	{ value: "draft", label: "Draft" },
	{ value: "sent", label: "Sent" },
	{ value: "overdue", label: "Overdue" },
	{ value: "paid", label: "Paid" },
];

export const VIEWS: readonly ShowcaseChoice[] = [
	{ value: "list", label: "List" },
	{ value: "board", label: "Board" },
	{ value: "calendar", label: "Calendar" },
];

export const SKELETON_SHOWN: readonly ShownSkeleton[] = [
	{ kind: "text" },
	{ kind: "row" },
	{ kind: "field" },
	{ kind: "sparkline", props: { height: 40 } },
	{ kind: "chart" },
	{ kind: "card" },
];

export const SHOWCASE_TODAY = new Date(2026, 9, 8);

export const FRAMEWORKS = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

export function spokenAmount(amount: number): string {
	return amount.toLocaleString("en", { style: "currency", currency: "EUR" });
}
