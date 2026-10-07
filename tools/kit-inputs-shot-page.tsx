import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { InputsSections } from "./kit-demo-inputs-sections.tsx";

const OPEN_DELAY_MS = 600;

const host = document.getElementById("host");
if (!host) throw new Error("kit inputs shot: the page has no #host");

createRoot(host).render(
	<div className="demo-page">
		<InputsSections />
	</div>,
);

if (location.hash === "#open") {
	setTimeout(() => {
		const trigger = document.querySelector<HTMLElement>("[data-slot='calendar'] [aria-label='Month']");
		trigger?.click();
	}, OPEN_DELAY_MS);
}
