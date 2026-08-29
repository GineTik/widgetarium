// What a WIDGET is allowed to see of its host: which environment it is running in and what
// it can do there. Never the store, and never the platform's own API — a widget holding
// Obsidian's `app` can reach the whole vault behind the engine, which is the model crossing
// into the view. Platform-agnostic on purpose: a web build narrows its own host the same way.
export function viewHost(host) {
	return {
		platform: host.platform,
		can: host.can,
		ui: {
			notify: (message) => host.ui.notify(message),
			// CONTEXT: an element the widget owns, never the renderer's reach into the vault
			// CONTEXT: a host without Obsidian answers can.renderMarkdown false
			renderMarkdown: (element, markdown, sourcePath) => host.ui.renderMarkdown(element, markdown, sourcePath),
		},
	};
}
