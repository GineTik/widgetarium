import { ROOT } from "./paths.js";

export const MEASURED_DIR = `${ROOT}/agent/measured`;

export const PRESET_TOKENS = {
	fill: "--wg-kit-group-fill",
	inset: "--wg-kit-group-inset",
};

export function measuredPathOf(notePath) {
	return `${MEASURED_DIR}/${notePath.replace(/[\\/]/g, "__")}.json`;
}
