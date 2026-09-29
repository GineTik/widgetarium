import {
	ICrudGateway,
	IHost,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	useData,
	z,
} from "widgetarium";
import type { ViewHost } from "widgetarium";
import { useRef } from "react";
import { cardSizeOf } from "./cards";
import { DEFAULT_TIERS } from "./tiers";
import { rackOf } from "./ordering";
import { Board } from "./board";
import { Renderer } from "./renderer";
import type { CardRow, May, RackView, RenderMarkdown, TierListProps, TierRow } from "./types";
import { useOpened } from "./use-opened";
import { useWriting } from "./use-writing";
import { Windows } from "./windows";

const ALL_CARDS = 500;

export const TierSchema = VaultRecordSchema.extend({
	label: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["name", "title", "tier"] }),
	tone: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["colour", "color"] }),
	order: z
		.number()
		.nullable()
		.exactOptional()
		.meta({ aka: ["position", "sort", "index"] }),
});

export const CardSchema = VaultRecordSchema.extend({
	tier: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["rank", "grade", "bucket"] }),
	order: z
		.number()
		.nullable()
		.exactOptional()
		.meta({ aka: ["position", "sort", "index"] }),
	picture: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["image", "avatar", "cover", "icon"] }),
});

const COULD_NOT_READ = "That source could not be read, so nothing is drawn.";

export const props = defineProps({
	cards: ICrudGateway.of(CardSchema).pick("list", "create", "update", "remove", "replace"),
	tiers: ICrudGateway.of(TierSchema, { default: DEFAULT_TIERS }).pick("list", "create", "update", "remove", "replace"),
	title: IValueGateway.of(z.string().default("Tier list")).pick("get", "update"),
	cardSize: IValueGateway.of(z.number().default(64)).pick("get", "update"),
	host: IHost,
});

const TierList = createWidget({
	inject: props,
	draw: ({ cards, tiers, title, cardSize, host }) => {
		const listedCards = useData(cards.list, { limit: ALL_CARDS });
		const listedTiers = useData(tiers.list, { limit: ALL_CARDS });
		const size = cardSizeOf(cardSize.value);

		const cardRows = listedCards.data as CardRow[];
		const tierRows = listedTiers.data as TierRow[];
		const held: RackView = rackOf(tierRows, cardRows);

		const rootRef = useRef<HTMLDivElement | null>(null);
		const opened = useOpened();
		const write = useWriting(held, { cards, tiers, say: sayingTo(host) });
		const may = mayDo(cards, tiers);
		const board = { held, opened, write, may, rootRef, size, cards: cardRows };
		const isBroken = Boolean(listedCards.failure || listedTiers.failure);

		return (
			<div className="wg-rank" ref={rootRef} style={{ "--wg-rank-card": `${size}px` } as Record<string, string>}>
				<Renderer.Provider value={host?.can?.renderMarkdown ? (host.ui.renderMarkdown as RenderMarkdown) : null}>
					{isBroken ? <span className="wr-failure">{COULD_NOT_READ}</span> : <Board heading={title.value} {...board} />}
					<Windows held={held} opened={opened} write={write} may={may} cards={cardRows.length} rows={tierRows.length} />
				</Renderer.Provider>
			</div>
		);
	},
});

export const metadata = defineMetadata(TierList, {
	title: "Tier list",
	description: "Cards dragged into named rows, best at the top, with everything unranked waiting in a tray.",
	keywords: [
		"tier",
		"tierlist",
		"rank",
		"ranking",
		"rate",
		"rating",
		"compare",
		"order",
		"best",
		"worst",
		"vote",
		"poll",
		"favourites",
		"drag",
		"drop",
		"grade",
		"s tier",
	],
	preview: {
		size: { w: 7, h: 6 },
		props: {
			title: { value: "Comfort food" },
			cardSize: { value: 48 },
			tiers: {
				rows: [
					{ label: "S", tone: "error", order: 1 },
					{ label: "A", tone: "warning", order: 2 },
					{ label: "B", tone: "standout", order: 3 },
					{ label: "C", tone: "success", order: 4 },
				],
			},
			cards: {
				rows: [
					{ name: "Pizza", tier: "S", order: 1 },
					{ name: "Ramen", tier: "S", order: 2 },
					{ name: "Dumplings", tier: "S", order: 3 },
					{ name: "Tacos", tier: "A", order: 4 },
					{ name: "Sushi", tier: "A", order: 5 },
					{ name: "Burger", tier: "B", order: 6 },
					{ name: "Pancakes", tier: "C", order: 7 },
					{ name: "Falafel" },
					{ name: "Pierogi" },
					{ name: "Ice cream" },
				],
			},
		},
		shot: { of: "115520328" },
	},
	props: {
		cards: {
			label: "Cards",
			hint: "The things being ranked. A folder of notes, or a list typed into the tile.",
			describes: {
				name: { label: "Name", type: "text", required: true },
				tier: { label: "Row", type: "text" },
				order: { label: "Order", type: "number" },
				picture: { label: "Picture", type: "text" },
			},
		},
		tiers: {
			label: "Rows",
			hint: "The rows, top to bottom. Each carries its own colour, and its name is what a card points at.",
			describes: {
				label: { label: "Name", type: "text", required: true },
				tone: { label: "Colour", type: "text" },
				order: { label: "Order", type: "number" },
			},
		},
		title: {
			label: "Title",
		},
		cardSize: {
			label: "Card size",
			hint: "How wide one card is, in pixels. Between 32 and 160; the rows reflow around it.",
			design: true,
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 280, stackBelowPx: 420 },
});

export default TierList;

function sayingTo(host?: ViewHost) {
	return (said: string) => {
		host?.ui?.notify(said);
		console.error(`[widgetarium] ${said}`);
	};
}

function mayDo(cards: TierListProps["cards"], tiers: TierListProps["tiers"]): May {
	return {
		preset: canDo(cards.replace) && canDo(tiers.replace),
		edit: canDo(cards.update),
		add: canDo(cards.create),
		addRow: canDo(tiers.create),
	};
}
