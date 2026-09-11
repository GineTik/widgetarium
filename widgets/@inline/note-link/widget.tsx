import { createWidget } from "widgetarium";
import type { InlineContent, Navigation } from "widgetarium";

const STYLE = `
.wgi-link {
	display: inline-flex;
	align-items: baseline;
	gap: 8px;
	padding: 6px 12px;
	border-radius: 999px;
	border: 1px solid var(--background-modifier-border);
	background: var(--background-primary);
	color: var(--text-normal);
	font: inherit;
	cursor: pointer;
}

.wgi-link:hover {
	border-color: var(--interactive-accent);
}

.wgi-link-name {
	font-weight: 600;
}

.wgi-link-state {
	font-size: 11px;
	color: var(--text-muted);
}

.wgi-link.is-missing .wgi-link-name {
	text-decoration: line-through;
	color: var(--text-muted);
}
`;

// CONTEXT: the widget that proves navigation is its own entity — no gateway verb opens a note
function NoteLink({ content, navigator }: InlineContent & { navigator: Navigation }) {
	const target = String(content ?? "").trim();
	const found = navigator.resolve(target);
	return (
		<button type="button" className={`wgi-link${found ? "" : " is-missing"}`} onClick={() => navigator.navigate(target)}>
			<style>{STYLE}</style>
			<span className="wgi-link-name">{target}</span>
			<span className="wgi-link-state">{found ? "open" : "not in this vault"}</span>
		</button>
	);
}

export default createWidget(NoteLink, { id: "@inline/note-link", title: "Note link", inline: true });
