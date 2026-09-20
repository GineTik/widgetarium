import { createWidget, defineManifest } from "widgetarium";
import { Surface } from "widgetarium/kit";

const STYLE = `
.wgi-note {
	border-left: 3px solid var(--wg-kit-accent);
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
		<Surface type="group" className="wgi-note">
			<style>{STYLE}</style>
			{lines.map((line, at) => (
				<p key={at} className="wgi-note-line">
					{line}
				</p>
			))}
		</Surface>
	);
});
