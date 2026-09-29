import { IHost, INavigator, IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import type { Navigation } from "widgetarium";
import { RenderedMarkdown } from "widgetarium/kit";
import { MissingImage } from "./missing-image";

const CSS = `
.flow-report-figure {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	margin: 0;
	min-width: 0;
}

.flow-report-figure-drawn {
	min-width: 0;
}

.flow-report-figure-drawn img,
.flow-report-figure-drawn svg,
.flow-report-figure-drawn canvas,
.flow-report-figure-drawn video {
	display: block;
	max-width: 100%;
	height: auto;
}

.flow-report-figure-drawn.markdown-rendered > :first-child {
	margin-top: 0;
}

.flow-report-figure-drawn.markdown-rendered > :last-child {
	margin-bottom: 0;
}

.flow-report-figure-plain {
	margin: 0;
	white-space: pre-wrap;
	font: inherit;
	overflow-x: auto;
}

.flow-report-figure-missing {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--wg-gap-parts);
	color: var(--wg-kit-text-muted);
	min-width: 0;
}

.flow-report-figure-missing-said {
	min-width: 0;
	overflow-wrap: anywhere;
}

.flow-report-figure-missing-alt {
	flex-basis: 100%;
	color: var(--text-faint);
	overflow-wrap: anywhere;
}

.flow-report-figure-caption {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	margin: 0;
	min-width: 0;
	color: var(--wg-kit-text-muted);
}
`;

type Figure = {
	caption?: string | null;
	image?: string | null;
	alt?: string | null;
	drawing?: string | null;
};

type Shown = { kind: "markdown"; markdown: string } | { kind: "missing"; said: string };

const NAMES_NOTHING = "This figure names no image.";
const NOT_IN_VAULT = "{name} is not in this vault.";
const CANNOT_BE_DRAWN = "{name} cannot be drawn here.";

const trimText = (held: unknown) => (typeof held === "string" ? held.trim() : "");

const embedOf = (path: string) => `![[${path}]]`;

function shownFigure(figure: Figure | null, navigation: Navigation, canDraw: boolean): Shown {
	const image = trimText(figure?.image);
	const drawing = trimText(figure?.drawing);
	if (!image) return drawing ? { kind: "markdown", markdown: drawing } : { kind: "missing", said: NAMES_NOTHING };
	if (!canDraw) return { kind: "missing", said: CANNOT_BE_DRAWN.replace("{name}", image) };
	const found = navigation.canNavigate ? navigation.resolve(image) : image;
	if (!found) return { kind: "missing", said: NOT_IN_VAULT.replace("{name}", image) };
	return { kind: "markdown", markdown: embedOf(found) };
}

const ReportFigure = createWidget({
	inject: {
		source: IValueGateway.of(z.custom<Figure>().default({})).pick("get"),
		host: IHost,
		navigator: INavigator,
	},
	draw: ({ source, host, navigator }) => {
		const caption = trimText(source.caption);
		const alt = trimText(source.alt);
		const shown = shownFigure(source, navigator, host.can.renderMarkdown);

		return (
			<figure className="flow-report-figure">
				<style>{CSS}</style>
				{shown.kind === "markdown" ? (
					<RenderedMarkdown
						host={host}
						markdown={shown.markdown}
						className="flow-report-figure-drawn"
						plainClassName="flow-report-figure-plain"
						part="drawing"
					/>
				) : (
					<MissingImage said={shown.said} alt={alt} />
				)}
				{caption ? <figcaption className="flow-report-figure-caption">{caption}</figcaption> : null}
			</figure>
		);
	},
});

export const metadata = defineMetadata(ReportFigure, {
	title: "Report figure",
	description:
		"One figure of a report: the picture this vault holds or the drawing written beside it, with the caption under it.",
	keywords: [
		"figure",
		"image",
		"picture",
		"screenshot",
		"diagram",
		"drawing",
		"illustration",
		"caption",
		"evidence",
		"report",
		"media",
	],
	preview: {
		size: { w: 4, h: 3 },
		props: {
			source: {
				value: {
					caption: "The drop wrapped the leaf it landed on, which is how a column is made by hand.",
					drawing: "```\n┌────────┬─────────────┐\n│  pane  │    card     │\n└────────┴─────────────┘\n```",
				},
			},
		},
	},
	props: {
		source: {
			label: "Figure",
			hint: "The figure to draw: a caption, and either the name of an image this vault holds or a drawing written as markdown.",
		},
	},
});

export const layout = defineLayout({
	role: "media",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 260 },
});

export default ReportFigure;
