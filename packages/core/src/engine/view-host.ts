import type { ViewHost } from "../gateway/host.js";

export function viewHost(host: ViewHost): ViewHost {
	return {
		platform: host.platform,
		type: host.type,
		can: host.can,
		console: host.console,
		ui: {
			notify: (message) => host.ui.notify(message),
			renderMarkdown: (element, markdown, sourcePath) => host.ui.renderMarkdown(element, markdown, sourcePath),
		},
	};
}
