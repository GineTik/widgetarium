import { JSDOM } from "jsdom";
import type { ViewStateResult } from "obsidian";
import { JobSchema } from "../packages/core/src/app-jobs.ts";
import type { Job } from "../packages/core/src/app-jobs.ts";
import { constructAsUntypedSource, callAsUntypedSource } from "./untyped-source.ts";
import { PROBE_VIEW } from "./vault-fixture.ts";

const dom = new JSDOM(`<!doctype html><body></body>`, { pretendToBeVisual: true });
const resized = new Set<() => void>();
class WatchedSize {
	constructor(readonly answer: () => void) {
		resized.add(answer);
	}
	observe(): void {}
	disconnect(): void {
		resized.delete(this.answer);
	}
}
class NeverSeen {
	observe(): void {}
	disconnect(): void {}
}
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
	CSS: { escape: (said: string) => said.replace(/["\\]/g, "\\$&") },
	ResizeObserver: WatchedSize,
	IntersectionObserver: NeverSeen,
});
Object.assign(dom.window, {
	ResizeObserver: WatchedSize,
	IntersectionObserver: NeverSeen,
	matchMedia: () => ({ matches: false }),
	requestIdleCallback: (run: () => void) => dom.window.setTimeout(run, 0),
});

const layerSize = { width: 3000, height: 1500 };
const isLayer = (element: Element): boolean => element.classList.contains("wg-design-layer");
Object.defineProperties(dom.window.HTMLElement.prototype, {
	offsetWidth: {
		get: function (this: HTMLElement) {
			return isLayer(this) ? layerSize.width : 0;
		},
	},
	offsetHeight: {
		get: function (this: HTMLElement) {
			return isLayer(this) ? layerSize.height : 0;
		},
	},
	createDiv: {
		value: function (this: HTMLElement, options: { cls?: string } = {}) {
			const made = dom.window.document.createElement("div");
			if (options.cls) made.className = options.cls;
			this.append(made);
			return made;
		},
	},
	addClass: {
		value: function (this: HTMLElement, cls: string) {
			this.classList.add(cls);
		},
	},
});

const { ItemView } = await import("obsidian");
Object.assign(ItemView.prototype, { setState: async () => undefined });
const { DesignView } = await import("../apps/obsidian/src/design-view.ts");
const { answerShotRequests, SHOTS_DIR, SHOT_REQUESTS_DIR } = await import("../apps/obsidian/src/shot-requests.ts");
const { designPathOf } = await import("../packages/core/src/app-design.ts");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const APP = "Demo";
const files = new Map<string, string>();
const designWith = (urls: readonly string[]): string =>
	JSON.stringify({ screens: [], references: urls.map((url) => ({ url, why: "the layout to copy" })) });
files.set(designPathOf(APP), designWith(["https://x.test/a.png"]));
const adapter = {
	read: async (path: string): Promise<string> => {
		const text = files.get(path);
		if (text === undefined) throw new Error(`no file ${path}`);
		return text;
	},
	exists: async (path: string): Promise<boolean> =>
		[...files.keys()].some((one) => one === path || one.startsWith(`${path}/`)),
	list: async (path: string) => ({ files: [...files.keys()].filter((one) => one.startsWith(`${path}/`)), folders: [] }),
	remove: async (path: string): Promise<void> => void files.delete(path),
	write: async (path: string, text: string): Promise<void> => void files.set(path, text),
	writeBinary: async (path: string): Promise<void> => void files.set(path, "png"),
	stat: async () => null,
	getResourcePath: (path: string) => path,
};

const jobOf = (page: string, phase: Job["phase"]): Job =>
	JobSchema.parse({
		id: `${page.toLowerCase()}-${phase}`,
		app: APP,
		title: `${phase} ${page}`,
		page,
		phase,
		says: `Work on ${page}.`,
		status: "running",
		createdAt: 1,
	});
let jobs: Job[] = [jobOf("Closed", "design"), jobOf("Open", "review")];
const jobWatchers = new Set<() => void>();
const intervals: number[] = [];
const workspace = { requestSaveLayout: () => undefined, getActiveViewOfType: () => null };
const pluginApp = { vault: { adapter }, workspace };
const plugin = {
	app: pluginApp,
	registry: new WidgetRegistry({ vault: { adapter } }),
	host: { ...PROBE_VIEW, slot: () => null, here: null },
	started: Promise.resolve(),
	assistant: {
		jobs: {
			jobsOf: () => jobs,
			watch: (onChange: () => void) => {
				jobWatchers.add(onChange);
				return () => jobWatchers.delete(onChange);
			},
			liveOf: () => null,
			stop: async () => undefined,
		},
	},
	registerInterval: (id: number) => void intervals.push(id),
};
const leaf = { updateHeader: () => undefined };
const contentEl = dom.window.document.body.createDiv({ cls: "workspace-leaf-content" });
Object.defineProperties(contentEl, { clientWidth: { value: 1600 }, clientHeight: { value: 1000 } });
const view = constructAsUntypedSource(DesignView, leaf, plugin);
Object.assign(view, {
	app: pluginApp,
	contentEl,
	register: () => undefined,
	registerInterval: (id: number) => void intervals.push(id),
	registerDomEvent: () => undefined,
});

const pause = (ms: number): Promise<void> => new Promise((done) => dom.window.setTimeout(done, ms));
const layerOf = (): HTMLElement | null => contentEl.querySelector<HTMLElement>(".wg-design-layer");
const resizeAll = (): void => {
	for (const answer of [...resized]) answer();
};
const personSees = () => ({
	page: view.getState()["page"],
	shown: Reflect.get(view, "shownPage"),
	camera: layerOf()?.style.transform ?? null,
});

await view.onOpen();
await view.setState({ app: APP, page: "Closed" }, standInResult());
await pause(100);
resizeAll();
await pause(1800);
const before = personSees();
check(
	"the person stands on the page they opened, with a camera laid",
	[before.page, Boolean(before.camera)],
	["Closed", true],
);

files.set(designPathOf(APP), designWith(["https://x.test/a.png", "https://x.test/b.png", "https://x.test/c.png"]));
layerSize.width = 7000;
layerSize.height = 4200;
resizeAll();
await pause(200);
check("the agent writing the design does not move the person's camera", personSees(), before);

jobs = [{ ...jobOf("Closed", "design"), status: "done" }, jobOf("Open", "review")];
for (const told of jobWatchers) told();
await pause(700);
check("the agent's job ending does not turn the person's page", personSees(), before);

callAsUntypedSource(answerShotRequests, plugin);
files.set(`${SHOT_REQUESTS_DIR}/agent.json`, JSON.stringify({ design: APP }));
let sawAgent = false;
const shotTold = async (): Promise<string> => {
	for (let tries = 0; tries < 60; tries += 1) {
		const answer = [...files.keys()].find((path) => path.startsWith(`${SHOTS_DIR}/agent.`));
		if (answer) return answer.slice(SHOTS_DIR.length + 1);
		if (contentEl.textContent?.includes("Agent is looking")) sawAgent = true;
		await pause(100);
	}
	return "";
};
const answered = await shotTold();
check("the agent's picture of the design was drawn and answered", answered.length > 0, true);
check("the person's canvas says where the agent is looking, without moving", sawAgent, true);
check("the agent's picture does not move the person's camera or page", personSees(), before);
check(
	"nothing the agent drew off screen is left in the window",
	dom.window.document.querySelectorAll(".wg-off-screen").length,
	0,
);

files.set(`${SHOT_REQUESTS_DIR}/page.json`, JSON.stringify({ design: APP, page: "Nowhere" }));
let pageRefusal = "";
for (let tries = 0; tries < 40 && !pageRefusal; tries += 1) {
	await pause(100);
	pageRefusal = files.get(`${SHOTS_DIR}/page.failed.txt`) ?? "";
}
check("a page the design does not hold is refused by name", pageRefusal.startsWith("Demo has no page Nowhere"), true);
check("and the agent's page picture leaves the person where they stand", personSees(), before);

for (const id of intervals) dom.window.clearInterval(id);
await view.onClose();
console.log(`\n${failed === 0 ? "canvas camera: clean" : `canvas camera: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);

function standInResult(): ViewStateResult {
	return { history: false };
}
