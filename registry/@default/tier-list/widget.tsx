import {
	ICommand,
	IHost,
	IQuery,
	RecordRefSchema,
	VaultRecordSchema,
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
import type { CardRow, Commands, May, RackView, RenderMarkdown, TierRow } from "./types";
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
	getCards: IQuery.expects(z.array(CardSchema)),
	createCard: ICommand.sends(CardSchema.extend({ id: z.uuid() })),
	updateCard: ICommand.sends(CardSchema.partial().extend({ ref: RecordRefSchema })),
	removeCard: ICommand.sends(z.object({ ref: RecordRefSchema })),
	replaceCards: ICommand.sends(z.array(CardSchema)),
	getTiers: IQuery.expects(z.array(TierSchema).default(DEFAULT_TIERS)),
	createTier: ICommand.sends(TierSchema.extend({ id: z.uuid() })),
	updateTier: ICommand.sends(TierSchema.partial().extend({ ref: RecordRefSchema })),
	removeTier: ICommand.sends(z.object({ ref: RecordRefSchema })),
	replaceTiers: ICommand.sends(z.array(TierSchema)),
	getTitle: IQuery.expects(z.string().default("Tier list")),
	getCardSize: IQuery.expects(z.number().default(64)),
	host: IHost,
});

const TierList = createWidget({
	inject: props,
	draw: ({ getCards, getTiers, getTitle: title, getCardSize: cardSize, host, ...commands }) => {
		const listedCards = useData(getCards, { limit: ALL_CARDS });
		const listedTiers = useData(getTiers, { limit: ALL_CARDS });
		const size = cardSizeOf(cardSize);

		const cardRows = listedCards.data as CardRow[];
		const tierRows = listedTiers.data as TierRow[];
		const held: RackView = rackOf(tierRows, cardRows);

		const rootRef = useRef<HTMLDivElement | null>(null);
		const opened = useOpened();
		const write = useWriting(held, { ...commands, say: sayingTo(host) });
		const may = mayDo(commands);
		const board = { held, opened, write, may, rootRef, size, cards: cardRows };
		const isBroken = Boolean(listedCards.failure || listedTiers.failure);

		return (
			<div className="wg-rank" ref={rootRef} style={{ "--wg-rank-card": `${size}px` } as Record<string, string>}>
				<Renderer.Provider value={host?.can?.renderMarkdown ? (host.ui.renderMarkdown as RenderMarkdown) : null}>
					{isBroken ? <span className="wr-failure">{COULD_NOT_READ}</span> : <Board heading={title} {...board} />}
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
			getTitle: { value: "Comfort food" },
			getCardSize: { value: 48 },
			getTiers: {
				rows: [
					{ label: "S", tone: "error", order: 1 },
					{ label: "A", tone: "warning", order: 2 },
					{ label: "B", tone: "standout", order: 3 },
					{ label: "C", tone: "success", order: 4 },
				],
			},
			getCards: {
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
		getCards: {
			label: "Cards",
			hint: "The things being ranked. A folder of notes, or a list typed into the tile.",
			aka: ["cards"],
			describes: {
				name: { label: "Name", type: "text", required: true },
				tier: { label: "Row", type: "text" },
				order: { label: "Order", type: "number" },
				picture: { label: "Picture", type: "text" },
			},
		},
		getTiers: {
			label: "Rows",
			hint: "The rows, top to bottom. Each carries its own colour, and its name is what a card points at.",
			aka: ["tiers"],
			describes: {
				label: { label: "Name", type: "text", required: true },
				tone: { label: "Colour", type: "text" },
				order: { label: "Order", type: "number" },
			},
		},
		createCard: {
			label: "Add a card",
			source: { implementation: "@core/rows-create", fields: { target: "getCards" } },
		},
		updateCard: {
			label: "Move or rename a card",
			source: { implementation: "@core/rows-update", fields: { target: "getCards" } },
		},
		removeCard: {
			label: "Remove a card",
			source: { implementation: "@core/rows-remove", fields: { target: "getCards" } },
		},
		replaceCards: {
			label: "Fill the cards from a preset",
			source: { implementation: "@core/rows-replace", fields: { target: "getCards" } },
		},
		createTier: {
			label: "Add a row",
			source: { implementation: "@core/rows-create", fields: { target: "getTiers" } },
		},
		updateTier: {
			label: "Rename or move a row",
			source: { implementation: "@core/rows-update", fields: { target: "getTiers" } },
		},
		removeTier: {
			label: "Remove a row",
			source: { implementation: "@core/rows-remove", fields: { target: "getTiers" } },
		},
		replaceTiers: {
			label: "Fill the rows from a preset",
			source: { implementation: "@core/rows-replace", fields: { target: "getTiers" } },
		},
		getTitle: {
			label: "Title",
			aka: ["title"],
		},
		getCardSize: {
			label: "Card size",
			hint: "How wide one card is, in pixels. Between 32 and 160; the rows reflow around it.",
			aka: ["cardSize"],
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

function mayDo({ replaceCards, replaceTiers, updateCard, createCard, createTier }: Commands): May {
	return {
		preset: replaceCards.can().can && replaceTiers.can().can,
		edit: updateCard.can().can,
		add: createCard.can().can,
		addRow: createTier.can().can,
	};
}
