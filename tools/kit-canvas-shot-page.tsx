import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { systemPageOf } from "../apps/obsidian/src/design-kit.ts";

const SYSTEM_PAGE = "Design system";
const CANVAS_ZOOM = 0.42;
const OPEN_DELAY_MS = 800;

const SYSTEM_RULES = [
	"The page is the theme's colour; a group is a 3% grey with no edge.",
	"Every colour is a --wg-kit-* token.",
	"Four type sizes: 11px and the host's three UI steps.",
	"Headings belong to layout widgets only.",
	"Corners step inward from the tile's own.",
	"One unusual form per widget, on the thing the eye looks for.",
];

const MARKDOWN_HOST = { can: { renderMarkdown: false }, ui: { renderMarkdown: () => () => undefined } };

const host = document.getElementById("host");
if (!host) throw new Error("kit canvas shot: the page has no #host");

createRoot(host).render(
	<div className="wg-design-field wg-portal is-pointer" style={{ position: "relative", height: "1500px" }}>
		<div className="wg-design-layer" style={{ transform: `scale(${CANVAS_ZOOM})` }}>
			{systemPageOf({
				title: SYSTEM_PAGE,
				docs: [
					{
						name: "Design system",
						path: ".widgetarium/apps/Studio/design-system.md",
						markdown: SYSTEM_RULES.map((rule) => `- ${rule}`).join("\n"),
					},
				],
				host: MARKDOWN_HOST,
			})}
		</div>
	</div>,
);

if (location.hash === "#open") {
	setTimeout(() => {
		const trigger = document.querySelector<HTMLElement>(".wg-design-kit [data-slot='select-trigger']");
		trigger?.click();
	}, OPEN_DELAY_MS);
}
