import type { Navigation } from "../gateway/host.js";

export const NOWHERE: Navigation = {
	canNavigate: false,
	resolve: () => null,
	navigate: () => false,
};
