import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { SHOWCASE } from "../packages/kit/src/showcase/index";
import type { ShowcaseId } from "../packages/kit/src/showcase/index";
import { ShowcaseSections } from "./kit-demo-sections.tsx";

const OPEN_DELAY_MS = 600;
const INPUTS: ReadonlySet<ShowcaseId> = new Set(["calendar", "fields", "choices", "combobox", "form", "datePicker"]);

const host = document.getElementById("host");
if (!host) throw new Error("kit inputs shot: the page has no #host");

createRoot(host).render(
	<div className="demo-page wg-showcase">
		<ShowcaseSections entries={SHOWCASE.filter((entry) => INPUTS.has(entry.id))} opened="none" />
	</div>,
);

if (location.hash === "#open") {
	setTimeout(() => {
		const trigger = document.querySelector<HTMLElement>("[data-slot='calendar'] [aria-label='Month']");
		trigger?.click();
	}, OPEN_DELAY_MS);
}
