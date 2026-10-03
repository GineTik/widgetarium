import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon } from "widgetarium/kit";

const SaidSchema = z.object({
	title: z.string(),
	lead: z.string(),
	mode: z.string(),
	isAsking: z.boolean(),
});

const ViewSchema = z.enum(["catalogue", "docs"]);

const VIEWS = [
	{ value: "catalogue", icon: "layout-grid", label: "Widget catalogue" },
	{ value: "docs", icon: "book-open", label: "Documentation" },
] as const;

const CatalogueHead = createWidget({
	inject: {
		getSaid: IQuery.expects(SaidSchema.default({ title: "Widgets", lead: "", mode: "browse", isAsking: false })),
		getView: IQuery.expects(ViewSchema.default("catalogue")),
		openView: ICommand.sends(z.object({ view: ViewSchema })),
	},
	draw: ({ getSaid: said, getView: view, openView }) => (
		<div>
			<div className="wg-catalogue-head">
				<div className="wg-catalogue-head-said">
					<h2 className="wg-catalogue-head-title">{said.title}</h2>
					{said.lead ? <p className="wg-catalogue-head-lead">{said.lead}</p> : null}
				</div>
				<div className="wg-catalogue-head-switch" role="tablist" aria-label="Catalogue or documentation">
					{VIEWS.map((one) => (
						<button
							key={one.value}
							type="button"
							role="tab"
							title={one.label}
							aria-label={one.label}
							aria-selected={view === one.value}
							className={view === one.value ? "wg-catalogue-head-tab is-on" : "wg-catalogue-head-tab"}
							onClick={() => view !== one.value && void openView({ view: one.value })}
						>
							<Icon name={one.icon} size={15} />
						</button>
					))}
				</div>
			</div>
		</div>
	),
});

export const metadata = defineMetadata(CatalogueHead, {
	title: "Catalogue head",
	description: "The title of the catalogue or the docs, the line under it, and a switch to the other.",
	keywords: ["catalogue", "docs", "heading", "title", "toggle", "switch", "sidebar"],
	preview: {
		size: { w: 4, h: 1 },
		props: {
			getSaid: {
				value: { title: "Widgets", lead: "Every widget this vault can draw", mode: "browse", isAsking: false },
			},
		},
	},
	props: {
		getSaid: {
			label: "Heading",
			hint: "The title and the line under it.",
		},
		getView: { label: "This view", hint: "Which of the two this is." },
		openView: {
			label: "Open the other view",
			source: { implementation: "@catalogue/open-view", fields: {} },
		},
	},
});

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default CatalogueHead;
