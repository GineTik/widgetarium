import type { CommandCard, PropCard } from "./catalogue-card.js";
import type { CatalogueEntry } from "./catalogue-read.js";
import type { WidgetSources } from "./widget-sources.js";

export interface WidgetRowView {
	readonly id: string;
	readonly title: string;
	readonly role: string | null;
	readonly description: string;
	readonly keywords: readonly string[];
	readonly registry: string;
}

export interface PropView {
	readonly name: string;
	readonly kind: string | null;
	readonly control: string | null;
	readonly type: string | null;
	readonly label: string | null;
	readonly verbs: readonly string[];
	readonly source: string | null;
	readonly fields: readonly string[];
}

export interface CommandView {
	readonly name: string;
	readonly label: string | null;
	readonly source: string | null;
}

export interface WidgetCardView extends WidgetRowView {
	readonly folder: string;
	readonly props: readonly PropView[];
	readonly commands: readonly CommandView[];
	readonly slots: readonly string[];
	readonly files: readonly string[];
	readonly libs: readonly string[];
	readonly dependencies: Readonly<Record<string, string>>;
	readonly widgetDependencies: readonly string[];
}

export function rowViewOf({ id, card, reader }: CatalogueEntry): WidgetRowView {
	return {
		id,
		title: card.title ?? id,
		role: card.role ?? null,
		description: card.description,
		keywords: card.keywords,
		registry: reader.at,
	};
}

export function cardViewOf(entry: CatalogueEntry, sources: WidgetSources): WidgetCardView {
	const { card } = entry;
	return {
		...rowViewOf(entry),
		folder: entry.folder,
		props: Object.entries(card.props).map(([name, prop]) => propViewOf(name, prop)),
		commands: Object.entries(card.commands).map(([name, command]) => commandViewOf(name, command)),
		slots: Object.keys(card.slots),
		files: card.files,
		libs: sources.libs.map(({ path }) => path),
		dependencies: card.dependencies,
		widgetDependencies: card.widgetDependencies,
	};
}

function propViewOf(name: string, prop: PropCard): PropView {
	return {
		name,
		kind: prop.kind ?? null,
		control: prop.control ?? null,
		type: prop.type ?? null,
		label: prop.label ?? null,
		verbs: prop.writes,
		source: prop.source?.implementation ?? null,
		fields: Object.keys(prop.describes ?? {}),
	};
}

function commandViewOf(name: string, command: CommandCard): CommandView {
	return { name, label: command.label ?? null, source: command.source?.implementation ?? null };
}
