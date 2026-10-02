import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button, Icon, Card } from "widgetarium/kit";

const CSS = `
.flow-notice {
	display: flex;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-notice-icon {
	color: var(--wg-kit-text-muted);
}

.wg-kit-tone .flow-notice-icon {
	color: inherit;
}

.flow-notice-said {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-notice-title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	margin: 0;
	min-width: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
	color: var(--wg-kit-text);
}

.flow-notice-empty {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-faint);
}

.flow-notice-body {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 4;
	overflow: hidden;
	margin: 0;
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.flow-notice .flow-notice-action {
	flex: none;
}

@container widget (width < 200px) {
	.flow-notice {
		flex-wrap: wrap;
	}

	.flow-notice .flow-notice-action {
		flex: 0 0 100%;
	}
}
`;

const NoticeWidget = createWidget({
	inject: {
		getTitle: IQuery.expects(z.string().default("")),
		getBody: IQuery.expects(z.string().default("")),
		getIcon: IQuery.expects(z.string().default("")),
		getTone: IQuery.expects(z.enum(["neutral", "info", "success", "warning", "error"]).default("neutral")),
		getAction: IQuery.expects(z.string().default("")),
		getIsPressed: IQuery.expects(z.boolean().default(false)),
		setIsPressed: ICommand.sends(z.boolean()),
	},
	draw: ({
		getTitle: title,
		getBody: body,
		getIcon: icon,
		getTone: tone,
		getAction: action,
		getIsPressed: isPressed,
		setIsPressed,
	}) => {
		const said = title.trim();
		const sentence = body.trim();
		const glyph = icon.trim();
		const label = action.trim();

		return (
			<Card type={tone === "neutral" ? "none" : "group"} tone={tone} className="flow-notice">
				<style>{CSS}</style>
				{glyph ? <Icon name={glyph} size={20} className="flow-notice-icon" /> : null}
				<div className="flow-notice-said">
					{said ? (
						<p className="flow-notice-title">{said}</p>
					) : (
						<p className="flow-notice-empty">Nothing to notice yet.</p>
					)}
					{sentence ? <p className="flow-notice-body">{sentence}</p> : null}
				</div>
				{label ? (
					<Button
						className="flow-notice-action"
						aria-label={label}
						aria-pressed={isPressed}
						disabled={!setIsPressed.can().can}
						onClick={() => void setIsPressed(!isPressed)}
					>
						{label}
					</Button>
				) : null}
			</Card>
		);
	},
});

export const metadata = defineMetadata(NoticeWidget, {
	title: "Notice",
	description: "One thing the person should notice: a count, a state or a warning, with an action beside it.",
	keywords: [
		"notice",
		"callout",
		"banner",
		"alert",
		"warning",
		"error",
		"status",
		"count",
		"message",
		"hint",
		"announcement",
		"empty state",
	],
	preview: {
		size: { w: 4, h: 2 },
		props: {
			getIcon: { value: "triangle-alert" },
			getTone: { value: "warning" },
			getTitle: { value: "3 bugs found today" },
			getBody: { value: "Two of them are in the importer and one is on the board." },
			getAction: { value: "Review" },
		},
	},
	props: {
		getTitle: {
			aka: ["title"],
			label: "Title",
			hint: "The one line a person reads first. Left empty, the notice says it has nothing to report.",
		},
		getBody: {
			aka: ["body"],
			label: "Body",
			hint: "The sentence under the title, for what the title could not hold.",
			control: "text",
		},
		getIcon: {
			aka: ["icon"],
			label: "Icon",
			hint: "The glyph beside the text, picked off the grid. Left empty, no icon is drawn.",
			control: "icon",
		},
		getTone: {
			aka: ["tone"],
			label: "Tone",
			hint: "Neutral draws no background of its own.",
			options: [
				{ value: "neutral", label: "Neutral" },
				{ value: "info", label: "Information" },
				{ value: "success", label: "Going well" },
				{ value: "warning", label: "Needs a look" },
				{ value: "error", label: "Something is wrong" },
			],
		},
		getAction: {
			aka: ["action"],
			label: "Action",
			hint: "What the button says. Left empty, the notice carries no button.",
		},
		getIsPressed: {
			aka: ["pressed"],
			keep: "screen",
			label: "Pressed",
			hint: "Whether the action has been pressed. A box names it as its trigger, or another tile reads it by ref.",
		},
		setIsPressed: {
			label: "Press the action",
			source: { implementation: "@core/value-set", fields: { target: "getIsPressed" } },
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 200 },
});

export default NoticeWidget;
