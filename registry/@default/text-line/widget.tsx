import { IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { cn } from "widgetarium/kit";

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
	color: var(--wg-kit-text-muted);
}

.wgi-text-line.is-value {
	color: var(--wg-kit-text);
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

const LINE_TAGS = ["p", "h1", "h2", "h3"] as const;

const TextLine = createWidget({
	inject: {
		text: IValueGateway.of(z.string().default("")).pick("get"),
		tone: IValueGateway.of(z.enum(["label", "value", "caption"]).default("value")).pick("get"),
		heading: IValueGateway.of(z.number().default(0)).pick("get"),
		lines: IValueGateway.of(z.number().default(0)).pick("get"),
	},
	draw: ({ text, tone, heading, lines }) => {
		const said = text.trim();
		const level = Math.min(countOf(heading), LINE_TAGS.length - 1);
		const clamped = countOf(lines);

		if (said === "") return null;

		const Line = LINE_TAGS[level] ?? "p";
		const style = clamped > 0 ? ({ "--wgi-line-clamp": String(clamped) } as Record<string, string>) : undefined;

		return (
			<>
				<style>{CSS}</style>
				<Line
					className={cn("wgi-text-line", TONE_CLASSES[tone], level > 0 && "is-heading", clamped > 0 && "is-clamped")}
					style={style}
				>
					{said}
				</Line>
			</>
		);
	},
});

export const metadata = defineMetadata(TextLine, {
	title: "Text line",
	description: "One line of text in the tone it is read as: a label, a value or a caption.",
	keywords: ["text", "line", "label", "value", "caption", "heading", "title", "subtitle", "note", "words", "sentence"],
	preview: {
		size: { w: 4, h: 1 },
		props: {
			text: { value: "Last synced four minutes ago" },
			tone: { value: "caption" },
		},
	},
	props: {
		text: { hint: "The line itself. Left empty, the widget draws nothing at all." },
		tone: {
			hint: "It decides the weight and the ink, never the plate.",
			options: [
				{ value: "label", label: "A label" },
				{ value: "value", label: "A value" },
				{ value: "caption", label: "A caption" },
			],
		},
		heading: {
			label: "Heading level",
			hint: "Zero draws a plain line. One, two or three draw the line as a heading of that level.",
		},
		lines: { hint: "How many lines the text may take before it is cut. Zero lets it run as long as it is." },
	},
});

export const layout = defineLayout({ role: "text", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default TextLine;

function countOf(held: number): number {
	const number = Math.trunc(held);
	return Number.isFinite(number) && number > 0 ? number : 0;
}
