import { IContent, INavigator, createWidget, defineLayout, defineMetadata } from "widgetarium";
const STYLE = `
.wgi-link {
	display: inline-flex;
	align-items: baseline;
	gap: 8px;
	padding: 6px 12px;
	border-radius: 999px;
	border: 1px solid var(--background-modifier-border);
	background: var(--background-primary);
	color: var(--wg-kit-text);
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
	color: var(--wg-kit-text-muted);
}

.wgi-link.is-missing .wgi-link-name {
	text-decoration: line-through;
	color: var(--wg-kit-text-muted);
}
`;

const NoteLink = createWidget({
	inject: {
		content: IContent,
		navigator: INavigator,
	},
	draw: ({ content, navigator }) => {
		const target = String(content ?? "").trim();
		const found = navigator.resolve(target);
		return (
			<button
				type="button"
				className={`wgi-link${found ? "" : " is-missing"}`}
				onClick={() => navigator.navigate(target)}
			>
				<style>{STYLE}</style>
				<span className="wgi-link-name">{target}</span>
				<span className="wgi-link-state">{found ? "open" : "not in this vault"}</span>
			</button>
		);
	},
});

export const metadata = defineMetadata(NoteLink, {
	title: "Note link",
	description: "A rounded chip in the text that opens another note in the vault.",
	keywords: ["link", "note", "chip", "open", "jump", "reference", "wikilink", "navigate", "shortcut", "pill", "button"],
	preview: { size: { w: 6, h: 2 }, content: "Board", shot: { of: "973396447" } },
});

export const layout = defineLayout({ inline: true, size: { preferredWidth: "full", preferredHeight: "auto" } });

export default NoteLink;
