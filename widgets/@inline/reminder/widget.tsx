import { createWidget } from "widgetarium";
import type { InlineContent } from "widgetarium";

const STYLE = `
.wgi-reminder {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 8px;
	border: 1px solid var(--background-modifier-border);
	background: var(--background-primary);
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

function Reminder({ content }: InlineContent) {
	return (
		<div className="wgi-reminder">
			<style>{STYLE}</style>
			<span className="wgi-reminder-mark">!</span>
			<span className="wgi-reminder-text">{content}</span>
		</div>
	);
}

export default createWidget(Reminder, { id: "@inline/reminder", title: "Reminder", inline: true });
