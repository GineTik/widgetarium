import { IHost, INavigator, IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, IconButton, RenderedMarkdown } from "widgetarium/kit";
import { Collapsed } from "./collapsed";

const MarkdownSourceSchema = z.union([
	z.string(),
	z.object({ content: z.string().nullish(), body: z.string().nullish(), path: z.string().nullish() }),
]);

type MarkdownSource = z.infer<typeof MarkdownSourceSchema>;

function markdownOf(source: MarkdownSource) {
	if (typeof source === "string") return source;
	return source.content ?? source.body ?? "";
}

function pathOf(source: MarkdownSource) {
	if (typeof source === "string") return null;
	return source.path ?? null;
}

function pixelsOf(held: number, fallback: number) {
	if (!Number.isFinite(held) || held < 0) return fallback;
	return held;
}

const ObsidianMarkdownPreview = createWidget({
	inject: {
		source: IValueGateway.of(MarkdownSourceSchema.default("")).pick("get"),
		collapsible: IValueGateway.of(z.boolean().default(false)).pick("get"),
		collapsedHeight: IValueGateway.of(z.number().default(240)).pick("get"),
		step: IValueGateway.of(z.number().default(0)).pick("get"),
		host: IHost,
		navigator: INavigator,
	},
	draw: ({ source, collapsible, collapsedHeight, step, host, navigator }) => {
		const collapsedPx = pixelsOf(collapsedHeight, 240);
		const stepPx = pixelsOf(step, 0);
		const path = pathOf(source);
		const canOpen = Boolean(path) && navigator.canNavigate;

		const note = (
			<>
				{canOpen ? (
					<IconButton
						size="xs"
						className="wg-markdown-preview-open"
						data-part="open"
						label="Open in a new tab"
						onClick={() => navigator.navigate(`/${path}`, { target: "blank" })}
					>
						<Icon name="open-tab" />
					</IconButton>
				) : null}
				<RenderedMarkdown
					host={host}
					markdown={markdownOf(source)}
					path={path}
					className="wg-markdown-preview-body"
					plainClassName="wg-markdown-preview-plain"
					part="body"
				/>
			</>
		);

		if (collapsible) {
			return (
				<Collapsed collapsedPx={collapsedPx} stepPx={stepPx}>
					{note}
				</Collapsed>
			);
		}
		return <div className="wg-markdown-preview">{note}</div>;
	},
});

export const metadata = defineMetadata(ObsidianMarkdownPreview, {
	title: "Obsidian markdown preview",
	description:
		"Text drawn the way Obsidian draws a note: a page or section title, an explanation the screen does not give on its own, a list, a whole note. It shows text and never edits it.",
	keywords: [
		"caption",
		"collapse",
		"description",
		"document",
		"embed",
		"explanation",
		"file",
		"header",
		"heading",
		"label",
		"markdown",
		"note",
		"page",
		"paragraph",
		"preview",
		"read",
		"render",
		"section",
		"show more",
		"subtitle",
		"text",
		"title",
	],
	preview: {
		size: { w: 6, h: 4 },
		props: {
			source: {
				value:
					"# Weekly review\n\nWhat moved, what stalled, and **one thing** for next week.\n\n- [x] Inbox to zero\n- [ ] Plan Monday\n- [ ] Call the printer\n\n## Notes\n\nThe launch slipped a week, and nobody minded.\n\nNext week is for the pricing page.",
			},
			collapsible: { value: true },
			collapsedHeight: { value: 180 },
		},
	},
	props: {
		source: {
			label: "Source",
			hint: "The markdown to draw, typed here or bound to a note. # titles the page, ## a region, ### a group; plain lines are paragraphs. Links and embeds work as in a note.",
		},
		collapsible: {
			label: "Collapse long text",
			hint: "Off, all of it is drawn. On, long text is cut to the collapsed height with Show more under it.",
		},
		collapsedHeight: {
			label: "Collapsed height, in pixels",
			hint: "How much of long text shows before Show more is pressed.",
		},
		step: {
			label: "Show more step, in pixels",
			hint: "How much each press of Show more opens. 0 opens all of it at once.",
		},
	},
});

export const layout = defineLayout({
	role: "text",
	size: { preferredWidth: "full", preferredHeight: "auto" },
});

export default ObsidianMarkdownPreview;
