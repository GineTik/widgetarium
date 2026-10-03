import { ICommand, IHost, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button, Icon, RenderedMarkdown } from "widgetarium/kit";

const PageSchema = z.object({
	id: z.string(),
	title: z.string(),
	body: z.string(),
	source: z.string(),
	action: z.object({ label: z.string(), icon: z.string(), href: z.string() }).nullable(),
	next: z.object({ id: z.string(), title: z.string() }).nullable(),
});

const NEXT = "Next";

const DocPage = createWidget({
	inject: {
		getPage: IQuery.expects(PageSchema.nullable().default(null)),
		openPage: ICommand.sends(z.string()),
		host: IHost,
	},
	draw: ({ getPage: page, openPage, host }) => {
		if (!page) return null;
		return (
			<article className="wg-catalogue-doc">
				<RenderedMarkdown
					host={host}
					markdown={page.body}
					className="wg-catalogue-doc-body"
					plainClassName="wg-catalogue-doc-plain"
				/>
				{page.action ? (
					<Button asChild variant="accent" size="m" className="wg-catalogue-doc-action">
						<a href={page.action.href} target="_blank" rel="noopener">
							<Icon name={page.action.icon} />
							<span>{page.action.label}</span>
						</a>
					</Button>
				) : null}
				{page.next ? (
					<button
						type="button"
						className="wg-catalogue-doc-next"
						onClick={() => page.next && void openPage(page.next.id)}
					>
						<span className="wg-catalogue-doc-next-said">
							<span className="wg-catalogue-doc-next-lead">{NEXT}</span>
							<span className="wg-catalogue-doc-next-name">{page.next.title}</span>
						</span>
						<Icon name="chevron-right" />
					</button>
				) : null}
				<span className="wg-catalogue-doc-source">{page.source}</span>
			</article>
		);
	},
});

export const metadata = defineMetadata(DocPage, {
	title: "Documentation page",
	description: "One page of the documentation, with a link to the next one.",
	keywords: ["docs", "documentation", "page", "markdown", "help", "guide"],
	preview: {
		size: { w: 4, h: 3 },
		props: {
			getPage: {
				value: {
					id: "add-your-own-widget",
					title: "Add your own widget",
					body: "## Add your own widget\nA widget is a folder.",
					source: "docs/catalogue/add-your-own-widget.md",
					action: null,
					next: { id: "publish-your-widget", title: "Publish your widget" },
				},
			},
		},
	},
	props: {
		getPage: { aka: ["page"], label: "Page", hint: "The page to show." },
		openPage: {
			label: "Open another page",
			hint: "Opens the next page when Next is pressed.",
		},
	},
});

export const layout = defineLayout({ role: "text", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default DocPage;
