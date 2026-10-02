import "./packs-registered.ts";
import { createElement as h, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { drawWidget } from "../packages/core/src/mounted.js";
import { previewProps, previewSize } from "../packages/core/src/preview.js";
import { GRID } from "../packages/core/src/paths.js";
import { PAGE_HOST, boom, filesAdapter, pageFiles, pageGlobal, reportsFailures, stackOf } from "./page-harness.ts";

type LatticeStyle = CSSProperties & { readonly "--wg-cell": string; readonly "--wg-gap": string };

const WANTED = String(pageGlobal("__WANTED__"));
const adapter = filesAdapter(pageFiles());

reportsFailures();

function Card(): ReactNode {
	const [registry, setRegistry] = useState<WidgetRegistry | null>(null);

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading
			.load()
			.then(() => setRegistry(loading))
			.catch((failure: unknown) => boom(`load: ${stackOf(failure)}`));
	}, []);

	if (!registry) return null;

	const definition = registry.get(WANTED);
	if (!definition) {
		boom(`${WANTED} is not in the registry`);
		return null;
	}
	if (definition.error) {
		boom(
			`${WANTED} does not load: ${definition.error instanceof Error ? definition.error.message : String(definition.error)}`,
		);
		return null;
	}
	const { component } = definition;
	if (!component) {
		boom(`${WANTED} has no component`);
		return null;
	}

	const size = previewSize(definition.manifest, GRID.cellPx, GRID.gapPx);
	const lattice: LatticeStyle = { "--wg-cell": `${GRID.cellPx}px`, "--wg-gap": `${GRID.gapPx}px` };
	const sized = { width: `${size.width}px`, height: `${size.height}px` };

	return h(
		"div",
		{ className: "wg-cat-stage", style: lattice },
		h(
			"div",
			{ className: "wg-cat-frame", style: sized },
			h(
				"div",
				{ className: "wg-cat-pic", inert: true },
				h(
					"div",
					{ className: "wg-cat-scaled", style: sized },
					drawWidget({ ...definition, component }, previewProps(definition, { registry, host: PAGE_HOST })),
				),
			),
		),
	);
}

const hostNode = document.getElementById("host");
if (hostNode) render(h(Card), hostNode);

function countDrawn(): void {
	const frame = document.querySelector(".wg-cat-frame");
	const pic = document.querySelector(".wg-cat-pic");
	const drew = pic instanceof HTMLElement ? pic.innerText : "";
	const rooted = document.querySelector(".wg-cat-scaled")?.firstElementChild?.getBoundingClientRect();
	const framedAt = frame?.getBoundingClientRect();
	const count = document.getElementById("count");
	if (!count) return;
	count.textContent = JSON.stringify({
		drawn: Boolean(frame),
		box: frame ? [frame.clientWidth, frame.clientHeight] : null,
		frameAt: framedAt ? [Math.round(framedAt.left), Math.round(framedAt.top)] : null,
		rootAt: rooted
			? [Math.round(rooted.left), Math.round(rooted.top), Math.round(rooted.width), Math.round(rooted.height)]
			: null,
		letters: drew.replace(/\s+/g, "").length,
		said: drew.slice(0, 160),
	});
}

setTimeout(countDrawn, 1500);
