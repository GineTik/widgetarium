import { refusingConsole } from "./host-console.js";

// CONTEXT: an environment that can do nothing still answers — `can` is what a widget asks
export const NO_HOST = {
	platform: "preview",
	type: "preview",
	can: {},
	console: refusingConsole("a preview has no console"),
	ui: { notify() {}, renderMarkdown: () => () => {} },
};
