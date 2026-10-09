import { useState } from "react";
import {
	INavigator,
	IQuery,
	type Row,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
} from "widgetarium";
import { z } from "zod";
import {
	Button,
	CommandMenu,
	CommandMenuInput,
	CommandMenuItem,
	CommandMenuOverlay,
	CommandMenuSection,
	EmptyState,
	Icon,
	Shape,
} from "widgetarium/kit";

const EntrySchema = VaultRecordSchema.extend({
	title: z.string().meta({ aka: ["name"] }),
	subtitle: z
		.string()
		.optional()
		.meta({ aka: ["role", "description"] }),
	section: z
		.string()
		.optional()
		.meta({ aka: ["kind", "type", "group"] }),
	photo: z
		.string()
		.optional()
		.meta({ aka: ["image", "picture"] }),
	link: z
		.string()
		.optional()
		.meta({ aka: ["url", "note"] }),
});

type Entry = Row<z.infer<typeof EntrySchema>>;

const ENTRIES_AT_MOST = 200;

const OTHER = "Other";

const CommandMenuWidget = createWidget({
	inject: {
		getEntries: IQuery.output(z.array(EntrySchema)),
		getPlaceholder: IQuery.output(z.string().default("Search")),
		getIsDialog: IQuery.output(z.boolean().default(false)),
		navigator: INavigator,
	},
	draw: ({ getEntries, getPlaceholder: placeholder, getIsDialog: isDialog, navigator }) => {
		const [query, setQuery] = useState("");
		const [isOpen, setOpen] = useState(false);
		const { data: entries } = useData(getEntries, { limit: ENTRIES_AT_MOST });
		const menu = (
			<CommandMenu label={placeholder}>
				<CommandMenuInput
					value={query}
					onValueChange={setQuery}
					placeholder={placeholder}
					hint={isDialog ? "Esc" : ""}
				/>
				<Results entries={matching(entries ?? [], query)} query={query} onOpen={(link) => navigator.navigate(link)} />
			</CommandMenu>
		);
		if (!isDialog) return menu;
		return (
			<>
				<Button onClick={() => setOpen(true)}>
					<Icon name="search" />
					{placeholder}
				</Button>
				<CommandMenuOverlay isOpen={isOpen} onClose={() => setOpen(false)}>
					{menu}
				</CommandMenuOverlay>
			</>
		);
	},
});

function Results({ entries, query, onOpen }: { entries: Entry[]; query: string; onOpen: (link: string) => void }) {
	if (entries.length === 0)
		return <EmptyState title={`Nothing matches "${query}"`} text="Try a shorter word or another name." isCompact />;
	const sections = [...new Set(entries.map((entry) => entry.section || OTHER))];
	return (
		<>
			{sections.map((section) => (
				<CommandMenuSection key={section} title={section}>
					{entries
						.filter((entry) => (entry.section || OTHER) === section)
						.map((entry) => (
							<CommandMenuItem
								key={entry.ref}
								title={entry.title}
								subtitle={entry.subtitle}
								leading={
									entry.photo ? (
										<img
											src={entry.photo}
											alt=""
											width={44}
											height={44}
											style={{ borderRadius: "50%", objectFit: "cover" }}
										/>
									) : (
										<Shape seed={entry.title} size={44} />
									)
								}
								onSelect={entry.link ? () => onOpen(entry.link ?? "") : undefined}
							/>
						))}
				</CommandMenuSection>
			))}
		</>
	);
}

function matching(entries: Entry[], query: string): Entry[] {
	const asked = query.trim().toLowerCase();
	if (asked === "") return entries;
	return entries.filter((entry) =>
		`${entry.title} ${entry.subtitle ?? ""} ${entry.section ?? ""}`.toLowerCase().includes(asked),
	);
}

export const metadata = defineMetadata(CommandMenuWidget, {
	title: "Command menu",
	description:
		"Search across records, grouped into sections, each result led by its photo or a shape; inline, or opened as a dialog from a button.",
	keywords: ["search", "command", "menu", "palette", "find", "spotlight", "quick open", "jump", "dialog"],
	preview: { size: { w: 8, h: 5 } },
	props: {
		getEntries: {
			describes: {
				title: { label: "Title", type: "line" },
				subtitle: { label: "Line under it", type: "line" },
				section: { label: "Section", type: "line" },
				photo: { label: "Photo address", type: "line" },
				link: { label: "Opens", type: "line" },
			},
			hint: "What can be found.",
		},
		getPlaceholder: { hint: "The words in the empty search field." },
		getIsDialog: { hint: "Draw a search button that opens the menu over the page." },
	},
});

export const layout = defineLayout({ role: "navigation", size: { preferredWidth: 560, preferredHeight: "auto" } });

export default CommandMenuWidget;
