import { refusingConsole } from "../engine/host-console.js";
import type { Navigation } from "../gateway/host.js";
import type { SurfaceHost } from "../surface/use-surface-shared.js";

const BROWSER = "browser";
const NO_CONSOLE = "a browser app has no console";
const NO_VAULT = "a browser app has no vault to bind a folder to";

export function browserHostOf(navigator: Navigation, pathname: string): SurfaceHost {
	return {
		platform: BROWSER,
		type: BROWSER,
		can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
		console: refusingConsole(NO_CONSOLE),
		ui: { notify: (said) => console.info(`[widgetarium] ${said}`), renderMarkdown: () => () => {} },
		slot: () => {
			throw new Error(NO_VAULT);
		},
		here: null,
		navigator,
		notePath: pathname,
	};
}
