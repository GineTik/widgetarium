import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Button, Icon, Card } from "widgetarium/kit";

const CSS = `
.flow-notice {
	display: flex;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-notice-icon {
	color: var(--text-muted);
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
	color: var(--text-normal);
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
	color: var(--text-muted);
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

const TONES = ["neutral", "info", "success", "warning", "error"] as const;

type Tone = (typeof TONES)[number];

function toneNamed(said: unknown): Tone {
	const named = String(said ?? "").toLowerCase() as Tone;
	return TONES.includes(named) ? named : "neutral";
}

export const manifest = defineManifest({
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
	role: "indicator",
	size: { collapseBelowPx: 120, stackBelowPx: 200 },
	preview: {
		size: { w: 4, h: 2 },
		props: {
			icon: { value: "triangle-alert" },
			tone: { value: "warning" },
			title: { value: "3 bugs found today" },
			body: { value: "Two of them are in the importer and one is on the board." },
			action: { value: "Review" },
		},
	},
	props: {
		title: defineProp<string>()({
			label: "Title",
			hint: "The one line a person reads first. Left empty, the notice says it has nothing to report.",
			default: "",
		}),
		body: defineProp<string>()({
			label: "Body",
			hint: "The sentence under the title, for what the title could not hold.",
			control: "text",
			default: "",
		}),
		icon: defineProp<string>()({
			label: "Icon",
			hint: "The glyph beside the text, picked off the grid. Left empty, no icon is drawn.",
			control: "icon",
			default: "",
		}),
		tone: defineProp<string>()({
			label: "Tone",
			hint: "One of neutral, info, success, warning or error. Neutral draws no background of its own.",
			default: "neutral",
		}),
		action: defineProp<string>()({
			label: "Action",
			hint: "What the button says. Left empty, the notice carries no button.",
			default: "",
		}),
		pressed: defineProp<boolean>()({
			label: "Pressed",
			hint: "Whether the action has been pressed. A box names it as its trigger, or another tile reads it by ref.",
			keep: "screen",
			default: false,
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ title, body, icon, tone, action, pressed }) => {
	const said = String(useData(title.get).data ?? "").trim();
	const sentence = String(useData(body.get).data ?? "").trim();
	const glyph = String(useData(icon.get).data ?? "").trim();
	const label = String(useData(action.get).data ?? "").trim();
	const toned = toneNamed(useData(tone.get).data);
	const isPressed = useData(pressed.get).data === true;

	return (
		<Card type={toned === "neutral" ? "none" : "group"} tone={toned} className="flow-notice">
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
					aria-pressed={String(isPressed)}
					disabled={!canDo(pressed.update)}
					onClick={() => pressed.update(!isPressed)}
				>
					{label}
				</Button>
			) : null}
		</Card>
	);
});
