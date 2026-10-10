import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { regionsOfPage } from "../packages/widgetarium/src/studio/design/design-canvas-page.ts";
import type { CanvasPageProps } from "../packages/widgetarium/src/studio/design/design-canvas-page.ts";
import { createProbeHost, createRowSlot } from "./vault-fixture.ts";

const CANVAS_ZOOM = 0.3;
const OPEN_DELAY_MS = 800;
const OPEN_MARK = "/open";

const SYSTEM_RULES = [
	"The page is the theme's colour; a group is a 3% grey with no edge.",
	"Every colour is a --wg-kit-* token.",
	"Four type sizes: 11px and the host's three UI steps.",
	"Headings belong to layout widgets only.",
	"Corners step inward from the tile's own.",
	"One unusual form per widget, on the thing the eye looks for.",
];

const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'><rect width='640' height='420' fill='#e7e5e0'/><rect x='40' y='40' width='180' height='340' rx='16' fill='#d4d1ca'/></svg>")}`;

const host: CanvasPageProps["host"] = createProbeHost(createRowSlot([]));

const registry: CanvasPageProps["registry"] = {
	list: () => [],
	get: () => null,
	tileRefOf: (id) => id,
};

const canvas: Omit<CanvasPageProps, "page"> = {
	screens: [],
	jobs: [],
	widgets: [{ id: "@studio/idea-card", isFromCatalogue: false }],
	references: ["notion-board.png", "linear-inbox.png", "things-today.png"].map((name, index) => ({
		name,
		src: PICTURE,
		why: index === 0 ? "Columns by stage, a count on each" : "A quiet list with one strong action",
		kind: "app",
		pages: index === 0 ? ["Ideas"] : [],
		notes: [{ text: "Columns by stage", tone: "take", at: [0.3, 0.2] }],
	})),
	docs: [
		{
			name: "Spec",
			path: ".widgetarium/apps/Studio/spec.md",
			markdown:
				"**Plan videos from idea to upload**\n## Features\n- **Ideas** — a list to catch them\n- **Filming** — what is shot this week",
		},
		{
			name: "Research",
			path: ".widgetarium/apps/Studio/research.md",
			markdown: "- Notion boards group by stage\n- Linear keeps one action per row",
		},
		{
			name: "This app's design system",
			path: ".widgetarium/apps/Studio/design-system.md",
			markdown: SYSTEM_RULES.map((rule) => `- ${rule}`).join("\n"),
		},
		{
			name: "Your design system",
			path: ".widgetarium/design-system.md",
			markdown: "- Big controls, large corners\n- Motion answers a press",
		},
	],
	controls: { live: () => null, stop: () => undefined },
	opener: { open: () => undefined, nameOf: (widget) => widget },
	pick: { variants: {}, onVariant: () => undefined },
	registry,
	host,
};

const asked = decodeURIComponent(location.hash.slice(1));
const page = asked.endsWith(OPEN_MARK) ? asked.slice(0, -OPEN_MARK.length) : asked;

const root = document.getElementById("host");
if (!root) throw new Error("canvas tabs shot: the page has no #host");

createRoot(root).render(
	<div className="wg-design-field wg-portal is-pointer" style={{ position: "relative", height: "1500px" }}>
		<div className="wg-design-layer" style={{ transform: `scale(${CANVAS_ZOOM})` }}>
			{regionsOfPage({ ...canvas, page })}
		</div>
	</div>,
);

if (asked.endsWith(OPEN_MARK)) {
	setTimeout(() => {
		const trigger = document.querySelector<HTMLElement>(".wg-design-kit [data-slot='select-trigger']");
		trigger?.click();
	}, OPEN_DELAY_MS);
}
