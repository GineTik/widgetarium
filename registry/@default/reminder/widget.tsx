import { createWidget, defineManifest } from "widgetarium";
import { Card } from "widgetarium/kit";

const STYLE = `
.wgi-reminder {
	display: flex;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
}

.wgi-reminder-mark {
	flex: none;
	width: 22px;
	height: 22px;
	border-radius: 7px;
	display: grid;
	place-items: center;
	font-weight: 700;
	font-size: 13px;
	color: var(--text-on-accent, #fff);
	background: var(--interactive-accent);
}

.wgi-reminder-text {
	line-height: 1.5;
}
`;

export const manifest = defineManifest({
	title: "Reminder",
	description: "A line of text with a tick beside it, for something that still has to be done.",
	keywords: [
		"reminder",
		"todo",
		"check",
		"tick",
		"task",
		"follow up",
		"remember",
		"checkbox",
		"deadline",
		"nudge",
		"prompt",
	],
	inline: true,
	preview: { size: { w: 6, h: 2 }, content: "call Olena before Friday", shot: { of: "486558682" } },
	size: { preferredWidth: "full", preferredHeight: "auto" },
	props: {},
});

export default createWidget(manifest, ({ content }) => {
	return (
		<Card type="group" className="wgi-reminder">
			<style>{STYLE}</style>
			<span className="wgi-reminder-mark">!</span>
			<span className="wgi-reminder-text">{content}</span>
		</Card>
	);
});
