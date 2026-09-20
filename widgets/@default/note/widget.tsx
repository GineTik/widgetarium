import { createWidget, defineManifest } from "widgetarium";

const STYLE = `
.wgi-note {
	border-left: 3px solid var(--interactive-accent);
	border-radius: 0 8px 8px 0;
	background: var(--background-secondary);
	padding: 10px 14px;
}

.wgi-note-line {
	margin: 0;
	line-height: 1.55;
	min-height: 1.55em;
}
`;

export const manifest = defineManifest({
	title: "Note",
	description: "A short block of text pinned in the middle of a note, marked in the accent colour.",
	keywords: ["note", "callout", "aside", "memo", "remark", "text", "block", "highlight", "quote", "panel", "comment"],
	inline: true,
	preview: {
		size: { w: 6, h: 2 },
		content: "Check before release:\naccess rights, error log.",
		shot: { of: "712696261" },
	},
	props: {},
});

export default createWidget(manifest, ({ content }) => {
	const lines = String(content ?? "").split("\n");
	return (
		<div className="wgi-note">
			<style>{STYLE}</style>
			{lines.map((line, at) => (
				<p key={at} className="wgi-note-line">
					{line}
				</p>
			))}
		</div>
	);
});
