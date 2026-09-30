import type { ViewHost } from "../gateway/host.js";
import { refusingConsole } from "./host-console.js";

export type HostClaimingNothing = Omit<ViewHost, "can"> & { readonly can: Partial<ViewHost["can"]> };

export const NO_HOST: HostClaimingNothing = {
	platform: "preview",
	type: "preview",
	can: {},
	console: refusingConsole("a preview has no console"),
	ui: { notify() {}, renderMarkdown: () => () => {} },
};
