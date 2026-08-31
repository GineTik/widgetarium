import { createWidget } from "widgetarium";

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

function Note({ content }) {
	const lines = String(content ?? "").split("\n");
	return (
		<div class="wgi-note">
			<style>{STYLE}</style>
			{lines.map((line, at) => (
				<p key={at} class="wgi-note-line">
					{line}
				</p>
			))}
		</div>
	);
}

export default createWidget(Note, { id: "@inline/note", title: "Note", inline: true });
