import { useLayoutEffect, useRef } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Icon, Card } from "widgetarium/kit";
import type { Navigation, ViewHost } from "widgetarium";

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

.flow-report-figure-failure {
	margin: 0;
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

const trimmed = (held: unknown) => (typeof held === "string" ? held.trim() : "");

const embedOf = (path: string) => `![[${path}]]`;

function shownFigure(figure: Figure | null, navigation: Navigation, canDraw: boolean): Shown {
	const image = trimmed(figure?.image);
	const drawing = trimmed(figure?.drawing);
	if (!image) return drawing ? { kind: "markdown", markdown: drawing } : { kind: "missing", said: NAMES_NOTHING };
	if (!canDraw) return { kind: "missing", said: CANNOT_BE_DRAWN.replace("{name}", image) };
	const found = navigation.canNavigate ? navigation.resolve(image) : image;
	if (!found) return { kind: "missing", said: NOT_IN_VAULT.replace("{name}", image) };
	return { kind: "markdown", markdown: embedOf(found) };
}

function RenderedMarkdown({ host, markdown }: { host: ViewHost; markdown: string }) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, markdown);
	}, [host, markdown]);

	if (!host.can.renderMarkdown) return <pre className="flow-report-figure-plain">{markdown}</pre>;
	return <div ref={body} className="flow-report-figure-drawn markdown-rendered" data-part="drawing" />;
}

function MissingImage({ said, alt }: { said: string; alt: string }) {
	return (
		<Card type="group" className="flow-report-figure-missing" data-part="missing">
			<Icon name="image-off" size={20} />
			<span className="flow-report-figure-missing-said">{said}</span>
			{alt ? <span className="flow-report-figure-missing-alt">{alt}</span> : null}
		</Card>
	);
}

export const manifest = defineManifest({
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
	role: "media",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 260 },
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
		source: defineProp<Figure>()({
			label: "Figure",
			hint: "The figure to draw: a caption, and either the name of an image this vault holds or a drawing written as markdown.",
			default: {},
		}),
	},
});

export default createWidget(manifest, ({ source, host, navigator }) => {
	const { data, failure } = useData(source.get);
	if (failure) return <p className="flow-report-figure-failure">{failure}</p>;

	const caption = trimmed(data?.caption);
	const alt = trimmed(data?.alt);
	const shown = shownFigure(data, navigator, host.can.renderMarkdown);

	return (
		<figure className="flow-report-figure">
			<style>{CSS}</style>
			{shown.kind === "markdown" ? (
				<RenderedMarkdown host={host} markdown={shown.markdown} />
			) : (
				<MissingImage said={shown.said} alt={alt} />
			)}
			{caption ? <figcaption className="flow-report-figure-caption">{caption}</figcaption> : null}
		</figure>
	);
});
