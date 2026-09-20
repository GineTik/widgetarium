import { ADAPTIVE, APART, COLUMN, DRAWER, GROUP, NO_SURFACE, OBJECT, ROW } from "./tree.js";

export const HEADING_WIDGET = "@default/text-line";

export const LAYOUTS = {
	page: {
		suits: "one thing to read, at a comfortable measure, with nothing beside it",
		holds: "a résumé, a proposal, a note somebody published",
		needsPx: 720,
		layout: beside(
			main("What the page is about", [
				title("The title of the page", "One line saying what this is and who it is for"),
				band("Opening", "The claim, before anything explains it", ["What is being said"]),
				split("The body", "The argument, and what stands beside it", "Prose", "What stands beside it"),
				strip("The figures", "The two or three numbers it rests on", 3, "indicators"),
				band("Closing", "What to do about it", ["The ask"]),
			]),
		),
	},

	"page-composed": {
		suits: "one page again, but arranged rather than stacked",
		holds: "a case study, a landing page, anything where the shape carries part of the argument",
		needsPx: 900,
		layout: beside(
			main("What the page is about", [
				title("The title of the page", "One line saying what this is"),
				band("The opening", "What the eye lands on first", ["The lead", "Beneath the lead"]),
				cards("What it is made of", "Three of a kind, read across", 3),
				split("The case", "The long half and the short half", "The long half", "The short half"),
				strip("The figures", "The numbers the argument rests on", 4, "indicators"),
				listDetail("The evidence", "Everything there is, and the one opened out of it"),
				band("The ask", "What happens next", ["What to do"]),
			]),
		),
	},

	workspace: {
		suits: "an application of several screens: somewhere to go, the work, and what is true about it now",
		holds: "a dashboard, a project, a record — every screen of one product wears this and stays recognisable",
		needsPx: 1200,
		layout: beside(
			navigation("Which screen, and which of its things"),
			main("The work this screen is about", [
				title("The screen", "What this screen is for, in one line"),
				strip("Overview", "What the person came to see first", 4, "indicators"),
				cards("Groups of work", "Each group, read across", 3),
				listDetail("The work", "The collection this screen exists for"),
				band("Everything else", "What did not fit above", ["The rest"]),
			]),
			aside("What is true about it right now", [
				sub("This week", "The few numbers worth a glance", 2, "indicators"),
				sub("Needs you", "What is waiting on a person", 1, "detail"),
			]),
		),
	},

	"three-pane": {
		suits: "exactly three steps: which set, which one of them, and what it holds",
		holds: "a mail client, a file browser, a vault of records read one at a time",
		needsPx: 1360,
		layout: beside(
			navigation("Which set"),
			main("Which one of them", [
				title("The set that is open", "What is being looked through"),
				band("Narrow it", "What is left in and what is cut", ["The controls"], "control"),
				listDetail("The set", "Everything in the set that was picked"),
			]),
			rail({
				role: "detail",
				purpose: "What the picked one holds",
				side: "start",
				width: 380,
				sections: [
					sub("The one open", "Everything about it", 1, "detail"),
					sub("What it touches", "Where it leads", 1, "navigation"),
				],
			}),
		),
	},

	"supporting-pane": {
		suits: "one thing being worked on, and what is worth knowing about it beside",
		holds: "a record and its history, a draft and its checks, a task and its session",
		needsPx: 980,
		layout: beside(
			main(
				"What is being worked on",
				[
					title("The thing", "What it is, in one line"),
					band("The thing itself", "Everything it is made of", ["The body"], "detail"),
					strip("Where it stands", "The few facts that change", 3, "indicators"),
					listDetail("Its parts", "Each part, and the one opened out of it"),
				],
				"detail",
			),
			aside("What is worth knowing about it", [
				sub("History", "What happened to it, newest first", 1, "detail"),
				sub("What it touches", "Where it leads", 1, "navigation"),
			]),
		),
	},

	split: {
		suits: "two halves, each a working page on its own, read side by side",
		holds: "a habit and its history, a timer and its log, a list and the one thing open",
		needsPx: 960,
		layout: beside(
			{
				dir: COLUMN,
				role: "collection",
				purpose: "One of the two, whole",
				surface: APART,
				side: "end",
				width: 420,
				of: [
					band("The set", "Everything there is, and today's mark against it", ["The set"]),
					strip("How it is going", "The mark the set adds up to", 2, "indicators"),
				],
			},
			main(
				"The other, whole",
				[
					title("The two halves", "What is being read side by side"),
					band("The one picked", "Everything about the thing that was picked", ["The body"], "detail"),
					split("Its two sides", "Read together", "One side", "The other"),
				],
				"detail",
			),
		),
	},

	surface: {
		suits: "one working surface a person acts in, with everything else out of its way",
		holds: "a kanban board, a day in time blocks, a calendar, a canvas",
		needsPx: 900,
		layout: beside(
			{
				dir: COLUMN,
				keep: true,
				role: "collection",
				purpose: "The surface being worked in",
				of: [
					title("The surface", "What is being worked in"),
					band("Controls", "What is shown and how", ["The controls"], "control"),
					{ dir: COLUMN, role: "collection", purpose: "The surface itself", of: [] },
					strip("What it adds up to", "Read under the surface", 3, "indicators"),
				],
			},
			rail({
				role: "detail",
				purpose: "The one thing opened out of the surface",
				side: "start",
				width: 340,
				sections: [
					sub("Open", "What was pressed", 1, "detail"),
					sub("Its history", "What happened to it", 1, "detail"),
				],
			}),
		),
	},

	journal: {
		suits: "entries in time order, where the newest matters most and the period frames them",
		holds: "a daily, a work log, a reading journal",
		needsPx: 860,
		layout: beside(
			rail({
				role: "indicators",
				purpose: "Which period, and how it went",
				side: "end",
				width: 300,
				sections: [
					sub("The period", "Which days are shown", 1, "control"),
					sub("How it went", "What the period adds up to", 2, "indicators"),
				],
			}),
			main("The entries themselves", [
				title("The journal", "Whose days these are"),
				band("Write one", "The entry being made now", ["The composer"], "composer"),
				strip("This period", "What the days add up to", 3, "indicators"),
				band("Earlier", "Everything already written, newest first", ["The entries"]),
			]),
		),
	},

	analytics: {
		suits: "numbers that only mean something beside each other",
		holds: "a health page, a spend report, anything read rather than acted in",
		needsPx: 1100,
		layout: beside(
			main("What the numbers say", [
				title("What is being measured", "The one question these numbers answer"),
				strip("The headline", "The figures the rest explains", 4, "indicators"),
				band("Over time", "How those figures moved", ["The line"], "indicator"),
				split("Broken down", "The same figures, two cuts", "By one thing", "By another"),
				band("Everything behind them", "The rows the figures came from", ["The rows"]),
			]),
			aside("What is being measured", [
				sub("The period", "Which span these numbers cover", 1, "control"),
				sub("Filters", "What is left in and what is cut", 2, "control"),
			]),
		),
	},

	library: {
		suits: "many documents and one of them open, read at full width",
		holds: "documentation, a handbook, a set of references",
		needsPx: 1000,
		layout: beside(
			navigation("Which page of the documentation"),
			main(
				"The page being read",
				[
					title("The page", "What this document is"),
					band("The page itself", "One document, rendered", ["The document"], "text"),
					strip("About it", "Who wrote it, when it changed", 3, "indicators"),
				],
				"detail",
			),
			rail({
				role: "indicators",
				purpose: "Where you are inside it",
				side: "start",
				width: 280,
				sections: [
					sub("On this page", "The headings, to jump by", 1, "navigation"),
					sub("What links here", "Where it leads", 1, "navigation"),
				],
			}),
		),
	},

	gallery: {
		suits: "a stock of things you scan, filter and act on",
		holds: "what is in the fridge, a library of assets, an inventory",
		needsPx: 1000,
		layout: beside(
			main("Everything there is", [
				title("The stock", "What is being kept"),
				band("Narrow it", "What is left in and what is cut", ["The controls"], "control"),
				strip("What it adds up to", "How much there is, and of what", 4, "indicators"),
				cards("The stock", "Every item, grouped by where it lives", 3),
				listDetail("What you could make", "What the stock is enough for"),
			]),
			aside("What needs attention", [
				sub("Soon", "What runs out or goes off first", 1, "indicator"),
				sub("Missing", "What is not there and should be", 1, "detail"),
			]),
		),
	},

	atlas: {
		suits: "places in space and time, kept by the person moving through them",
		holds: "a trip, a route, a set of visits",
		needsPx: 1040,
		layout: beside(
			main("The journey", [
				title("The journey", "Where it goes and when"),
				band("The route", "Where it goes, drawn", ["The map"], "media"),
				strip("The shape of it", "How long, how far, how much", 4, "indicators"),
				listDetail("Stops", "Each place, and what happened there"),
				cards("What was seen", "Each one, read across", 3),
			]),
			aside("What is arranged", [
				sub("Budget", "What is set aside and what is left", 2, "indicators"),
				sub("Booked", "Where you are staying", 1, "detail"),
			]),
		),
	},

	showcase: {
		suits: "an argument walked through, one beat at a time",
		holds: "a short deck, a pitch, anything presented rather than browsed",
		needsPx: 900,
		layout: beside(
			main(
				"The argument",
				[
					title("The statement", "The one line it all rests on"),
					band("The opening beat", "Where the argument starts", ["The beat"], "text"),
					cards("The beats", "Three or four points, each its own band", 3),
					strip("The figure", "The number that settles it", 2, "indicators"),
					band("The ask", "What happens next", ["The ask"], "text"),
				],
				"text",
			),
		),
	},

	notebook: {
		suits: "a note that knows what it is about and what it connects to",
		holds: "lecture notes, a research log, a reading note",
		needsPx: 1200,
		layout: beside(
			navigation("Which subject, and which note in it"),
			main(
				"The note being written",
				[
					title("The note", "What this note is about"),
					band("The note itself", "Everything written here", ["The body"], "text"),
					split("What it rests on", "The two halves of the working", "The working", "The sources"),
					strip("Where it stands", "How far along it is", 3, "indicators"),
				],
				"detail",
			),
			rail({
				role: "indicators",
				purpose: "Where this note sits among the rest",
				side: "start",
				width: 330,
				sections: [
					sub("On the timeline", "When the things in this note happened", 1, "indicator"),
					sub("Connected", "What this note leads to", 1, "navigation"),
				],
			}),
		),
	},

	drill: {
		suits: "one thing at a time, recalled rather than read",
		holds: "flashcards, a quiz, a review session",
		needsPx: 720,
		layout: beside(
			main(
				"The session",
				[
					title("The session", "What is being drilled"),
					strip("Where you are", "How much is left of this run", 3, "indicators"),
					band("The card", "The one thing being asked", ["The card"], "detail"),
					band("How it went", "What you said, and what that schedules", ["The answer"], "composer"),
					band("What comes back", "What is due after this run", ["What is due"]),
				],
				"detail",
			),
		),
	},
};

export const LAYOUT_NAMES = Object.keys(LAYOUTS);

export function layoutNamed(said) {
	const name = String(said ?? "").trim();
	return Object.hasOwn(LAYOUTS, name) ? LAYOUTS[name] : null;
}

export function skeletonOf(name, asBoard) {
	const held = layoutNamed(name);
	if (!held) return null;
	const minting = { at: 0, tiles: [] };
	const layout = placed(structuredClone(held.layout), minting);
	return asBoard({ v: 2, tiles: minting.tiles, mode: "expanded", base: name, layout });
}

export function sectionsOf(node, found = []) {
	for (const child of node?.of ?? []) {
		if (child.heading) found.push({ name: child.heading, role: child.role ?? null, purpose: child.purpose ?? null });
		sectionsOf(child, found);
	}
	return found;
}

export function textPlacesOf(node, found = []) {
	for (const child of node?.of ?? []) {
		if (child.text !== undefined) found.push(child);
		textPlacesOf(child, found);
	}
	return found;
}

export function emptyColumnsOf(root) {
	return (root?.of ?? []).flatMap((column, at) => ((column?.of ?? []).length === 0 ? [at] : []));
}

export function baseMismatch(name, root) {
	const held = layoutNamed(name);
	if (!held) return `${name} is not a base; the ones a screen starts from are ${LAYOUT_NAMES.join(", ")}.`;
	const asked = held.layout.of;
	const standing = root?.of ?? [];
	if (standing.length !== asked.length)
		return `the board says ${name}, which cuts the page into ${asked.length} regions, and this one has ${standing.length}`;
	const wrong = asked.flatMap((region, at) => miscast(region, standing[at], at));
	return wrong.length > 0 ? `the board says ${name}, but ${wrong.join("; ")}` : null;
}

function miscast(asked, standing, at) {
	if (standing?.role === asked.role) return [];
	return [`region ${at} should hold ${asked.role} and holds ${standing?.role ?? "nothing declared"}`];
}

function placed(node, minting) {
	if (node.text !== undefined) return mintedText(node, minting);
	const { heading, ...box } = node;
	return { ...box, of: node.of.map((child) => placed(child, minting)) };
}

function mintedText(node, minting) {
	const id = `t${minting.at}`;
	minting.at += 1;
	minting.tiles.push({
		id,
		widget: HEADING_WIDGET,
		props: {
			text: { from: "typed", value: node.text },
			tone: { from: "typed", value: node.tone ?? "value" },
			heading: { from: "typed", value: node.level ?? 0 },
		},
	});
	return { id, ...(node.surface ? { surface: node.surface } : {}) };
}

function text(said, level, tone) {
	return { text: said, level, tone, surface: NO_SURFACE };
}

function title(said, description) {
	return {
		dir: COLUMN,
		role: "text",
		purpose: "What this screen is and what it is for",
		surface: NO_SURFACE,
		of: [text(said, 1, "value"), text(description, 0, "caption")],
	};
}

function headed(heading, purpose, role, of) {
	return {
		dir: COLUMN,
		heading,
		role,
		purpose,
		surface: NO_SURFACE,
		of: [text(heading, 2, "value"), text(purpose, 0, "caption"), ...of],
	};
}

function hole(purpose, role, surface = GROUP) {
	return { dir: COLUMN, role, purpose, surface, of: [] };
}

function band(heading, purpose, holes, role = "collection") {
	return headed(
		heading,
		purpose,
		role,
		holes.map((said) => hole(said, role)),
	);
}

function cards(heading, purpose, across) {
	return headed(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Each one, read across",
			of: Array.from({ length: across }, (ignored, at) => hole(`Card ${at + 1}`, "detail", OBJECT)),
		},
	]);
}

function strip(heading, purpose, across, role) {
	return headed(heading, purpose, role, [
		{
			dir: ROW,
			role,
			purpose: "The figures, read beside each other",
			of: Array.from({ length: across }, (ignored, at) => hole(`Figure ${at + 1}`, "indicator")),
		},
	]);
}

function split(heading, purpose, wide, narrow) {
	return headed(heading, purpose, "detail", [
		{
			dir: ROW,
			role: "detail",
			purpose: "The two halves, read together",
			of: [{ ...hole(wide, "detail"), ratio: 2 }, hole(narrow, "detail")],
		},
	]);
}

function listDetail(heading, purpose) {
	return headed(heading, purpose, "collection", [
		{
			dir: ROW,
			role: "collection",
			purpose: "Everything there is, and the one opened out of it",
			of: [{ ...hole("Everything there is", "collection"), ratio: 2 }, hole("The one open", "detail")],
		},
	]);
}

function sub(heading, purpose, holes, role) {
	return headed(
		heading,
		purpose,
		role,
		Array.from({ length: holes }, (ignored, at) => hole(holes === 1 ? purpose : `Part ${at + 1}`, role)),
	);
}

function rail({ role, purpose, side, width, sections }) {
	return {
		dir: COLUMN,
		role,
		purpose,
		surface: APART,
		side,
		width,
		collapse: { into: DRAWER, toggle: ADAPTIVE },
		of: sections,
	};
}

function navigation(purpose) {
	return rail({
		role: "navigation",
		purpose,
		side: "end",
		width: 260,
		sections: [sub("Go to", purpose, 1, "navigation"), sub("Within it", "Which of its things", 1, "navigation")],
	});
}

function aside(purpose, sections) {
	return rail({ role: "indicators", purpose, side: "start", width: 320, sections });
}

function main(purpose, sections, role = "collection") {
	return { dir: COLUMN, keep: true, role, purpose, of: sections };
}

function beside(...regions) {
	return { dir: ROW, of: regions };
}
