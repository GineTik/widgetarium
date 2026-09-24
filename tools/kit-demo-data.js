export const MONTHS = [
	{ month: "Jan", notes: 186, links: 80 },
	{ month: "Feb", notes: 305, links: 200 },
	{ month: "Mar", notes: 237, links: 120 },
	{ month: "Apr", notes: 73, links: 190 },
	{ month: "May", notes: 209, links: 130 },
	{ month: "Jun", notes: 214, links: 140 },
];

export const SERIES = { notes: { label: "Notes" }, links: { label: "Links" } };

export const AREAS = [
	{ area: "work", hours: 21, fill: "var(--color-work)" },
	{ area: "learning", hours: 11, fill: "var(--color-learning)" },
	{ area: "health", hours: 9, fill: "var(--color-health)" },
	{ area: "home", hours: 9, fill: "var(--color-home)" },
];

export const AREA_CONFIG = {
	hours: { label: "Hours" },
	work: { label: "Work", color: 1 },
	learning: { label: "Learning", color: 2 },
	health: { label: "Health", color: 3 },
	home: { label: "Home", color: 4 },
};

export const CHART_MARGIN = { top: 8, right: 12, left: 12, bottom: 0 };

export const WEEKS = [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27];

export const CLIENTS = [
	"Halden & Co",
	"Northwind Studio",
	"Juniper Books",
	"Kettle Labs",
	"Mira Okafor",
	"Brightline Health",
	"Hawthorne Dental",
	"Brigham & Sons",
];

export const STATUSES = [
	{ label: "Paid", tone: "success" },
	{ label: "Sent", tone: "info" },
	{ label: "Overdue", tone: "error" },
	{ label: "Draft", tone: "neutral" },
];

export const INVOICES = Array.from({ length: 48 }, (_, at) => ({
	id: `INV-2026-${String(at + 1).padStart(3, "0")}`,
	client: CLIENTS[at % CLIENTS.length],
	status: STATUSES[at % STATUSES.length],
	issued: `${1 + ((at * 7) % 28)} Aug`,
	due: `${1 + ((at * 11) % 28)} Sep`,
	owner: ["Ana", "Ben", "Chen", "Dara"][at % 4],
	project: ["Website", "Retainer", "Audit", "Launch", "Support"][at % 5],
	amount: 300 + ((at * 137) % 4000),
}));

export const COLUMNS = ["Invoice", "Client", "Status", "Issued", "Due", "Owner", "Project", "Amount"];

export const ROWS_PER_PAGE = 6;

export const CAPTION = "Sample invoices, {count} rows, {per} a page.";

export const NARROW_CAPTION = "The same table in a 340px region scrolls sideways, and the pages drop their words.";

export const THEMES = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
];

export const STATUS_ITEMS = [
	{ value: "draft", label: "Draft" },
	{ value: "sent", label: "Sent" },
	{ value: "overdue", label: "Overdue" },
	{ value: "paid", label: "Paid" },
];

export const VIEWS = [
	{ value: "list", label: "List" },
	{ value: "board", label: "Board" },
	{ value: "calendar", label: "Calendar" },
];

export const SKELETON_SHOWN = [
	{ kind: "text" },
	{ kind: "row" },
	{ kind: "field" },
	{ kind: "sparkline", props: { height: 40 } },
	{ kind: "chart" },
	{ kind: "card" },
];

export function spokenAmount(amount) {
	return amount.toLocaleString("en", { style: "currency", currency: "EUR" });
}
