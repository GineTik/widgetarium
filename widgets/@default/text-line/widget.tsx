import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { cx } from "widgetarium/kit";

const CSS = `
.wgi-text-line {
	margin: 0;
	min-width: 0;
}

.wgi-text-line:not(.is-heading).is-label {
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
}

.wgi-text-line:not(.is-heading).is-value {
	font-size: var(--font-ui-medium, 15px);
}

.wgi-text-line:not(.is-heading).is-caption {
	font-size: var(--font-ui-smaller, 12px);
}

.wgi-text-line.is-label {
	color: var(--text-muted);
}

.wgi-text-line.is-value {
	color: var(--text-normal);
}

.wgi-text-line.is-caption {
	color: var(--text-faint);
}

.wgi-text-line.is-clamped {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: var(--wgi-line-clamp);
	overflow: hidden;
}
`;

const TONE_CLASSES = { label: "is-label", value: "is-value", caption: "is-caption" };

type Tone = keyof typeof TONE_CLASSES;

const LINE_TAGS = ["p", "h1", "h2", "h3"] as const;

export const manifest = defineManifest({
	title: "Text line",
	description: "One line of text in the tone it is read as: a label, a value or a caption.",
	keywords: ["text", "line", "label", "value", "caption", "heading", "title", "subtitle", "note", "words", "sentence"],
	role: "text",
	preview: {
		size: { w: 4, h: 1 },
		props: {
			text: { value: "Last synced four minutes ago" },
			tone: { value: "caption" },
		},
	},
	props: {
		text: defineProp<string>()({
			label: "Text",
			hint: "The line itself. Left empty, the widget draws nothing at all.",
			default: "",
		}),
		tone: defineProp<string>()({
			label: "Tone",
			hint: "One of label, value or caption. It decides the weight and the ink, never the plate.",
			default: "value",
		}),
		heading: defineProp<number>()({
			label: "Heading level",
			hint: "Zero draws a plain line. One, two or three draw the line as a heading of that level.",
			default: 0,
		}),
		lines: defineProp<number>()({
			label: "Lines",
			hint: "How many lines the text may take before it is cut. Zero lets it run as long as it is.",
			default: 0,
		}),
	},
});

export default createWidget(manifest, ({ text, tone, heading, lines }) => {
	const said = String(useData(text.get).data ?? "").trim();
	const toned = toneNamed(useData(tone.get).data);
	const level = Math.min(countOf(useData(heading.get).data), LINE_TAGS.length - 1);
	const clamped = countOf(useData(lines.get).data);

	if (said === "") return null;

	const Line = LINE_TAGS[level] ?? "p";
	const style = clamped > 0 ? ({ "--wgi-line-clamp": String(clamped) } as Record<string, string>) : undefined;

	return (
		<>
			<style>{CSS}</style>
			<Line
				className={cx("wgi-text-line", TONE_CLASSES[toned], level > 0 && "is-heading", clamped > 0 && "is-clamped")}
				style={style}
			>
				{said}
			</Line>
		</>
	);
});

function toneNamed(said: unknown): Tone {
	const named = String(said ?? "").toLowerCase();
	return Object.hasOwn(TONE_CLASSES, named) ? (named as Tone) : "value";
}

function countOf(held: unknown): number {
	const number = Math.trunc(Number(held));
	return Number.isFinite(number) && number > 0 ? number : 0;
}
