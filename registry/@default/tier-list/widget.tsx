import {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	canDo,
	createWidget,
	defineManifest,
	defineProp,
	useData,
	verb,
} from "widgetarium";
import type { Aka, Row, Text, VaultRecord, ViewHost, WidgetProps } from "widgetarium";
import { Button, ButtonLabel, Count, Field, Icon, TONE_NAMES, toneClass } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
	cardSizeOf,
	DEFAULT_TIERS,
	freeLabel,
	isLabelTaken,
	labelOf,
	nameOf,
	nextToneAfter,
	orderBetween,
	pictureOf,
	placedAt,
	PRESETS,
	rackOf,
	renumbered,
	rowsOf,
	toneForSeed,
	toneOf,
} from "@default/lib";
import type { Picture, Preset } from "@default/lib";

const ALL_CARDS = 500;

type TierRecord = VaultRecord & {
	label?: (Text & Aka<"name" | "title" | "tier">) | null;
	tone?: (Text & Aka<"colour" | "color">) | null;
	order?: (number & Aka<"position" | "sort" | "index">) | null;
};

type CardRecord = VaultRecord & {
	tier?: (Text & Aka<"rank" | "grade" | "bucket">) | null;
	order?: (number & Aka<"position" | "sort" | "index">) | null;
	picture?: (Text & Aka<"image" | "avatar" | "cover" | "icon">) | null;
};

type TierListProps = WidgetProps<typeof manifest>;

type CardRow = Row<CardRecord>;
type TierRow = Row<TierRecord>;
type RackLine = { row: TierRow; label: string; tone: string; cards: CardRow[] };
type RackView = { tiers: TierRow[]; rack: RackLine[]; tray: CardRow[]; orphans: CardRow[]; ranked: number };
type Target = { tier: string | null; at: number };
type Carry = { row: CardRow; x: number; y: number; offX: number; offY: number; isDragging: boolean };
type Draft = { name: string; picture: string };
type RenderMarkdown = ViewHost["ui"]["renderMarkdown"];
type Gates = {
	cards: TierListProps["cards"];
	tiers: TierListProps["tiers"];
	say: (said: string) => void;
};
type Writing = ReturnType<typeof useWriting>;
type Opened = ReturnType<typeof useOpened>;

const TAP_SLOP_PX = 4;
const FOG_REACH_PX = 24;

const NOTHING_TO_RANK = "Nothing to rank yet. Add a card, or start from a preset.";
const NO_ROWS = "No rows yet. Everything sits in the tray until there is somewhere to put it.";
const EVERYTHING_RANKED = "Everything is ranked. Drag a card back here to unrank it.";
const COULD_NOT_READ = "That source could not be read, so nothing is drawn.";
const CANNOT_MOVE = "This source cannot be written here, so the card stayed where it was.";
const CANNOT_ADD_CARD = "This source does not take new cards, so nothing was added.";
const CANNOT_ADD_ROW = "This list does not take new rows, so nothing was added.";
const CANNOT_WRITE_ROW = "This list cannot be written here, so the row stayed as it was.";
const CANNOT_REMOVE_ROW = "This list does not drop rows, so the row is still here.";
const CARDS_ARE_READ_ONLY = "The cards under this row cannot be rewritten, so renaming it would lose them.";
const ALREADY_A_ROW = "A row is already called that, so the name stayed as it was.";
const NO_PRESETS_HERE = "A preset may only fill a list typed into this tile, never a folder in the vault.";
const RENAME_REWRITES =
	"The name is what the cards point at, so renaming this row also rewrites the {count} cards in it.";
const EIGHT_COLOURS = "Eight colours, and they follow the vault's theme. A ninth row repeats one.";
const PRESET_TITLE = "Start from a preset";
const PRESET_SAID = "A preset fills this tile. Nothing is written into the vault, and every card can be put back.";
const PRESET_NEEDS_WEB = "needs the web";
const RESET_TITLE = "Put {count} cards back in the tray?";
const RESET_SAID =
	"Every card leaves the row it is in and returns to the tray. The rows, their names and their colours stay exactly as they are, and no card is deleted.";
const RESET_CONFIRM = "Put them back";
const REPLACE_TITLE = "Replace what is here with {name}?";
const REPLACE_SAID =
	"The {cards} cards and {rows} rows in this tile are dropped, and the preset's own take their place.";
const REPLACE_CONFIRM = "Use this preset";
const ORPHANS_SAID = "Filed under a row that is gone";
const ORPHANS_ACTION = "Put them in the tray";
const CARD_PICTURE_SAID =
	"A web address, an attachment in this vault, or emoji: followed by a face name. Left empty, the card draws its letters.";
const CARDS_COUNTED = "{count} cards";

const Renderer = createContext<RenderMarkdown | null>(null);

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 280, stackBelowPx: 420 },
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
		cards: defineProp<CardRecord[]>()({
			label: "Cards",
			hint: "The things being ranked. A folder of notes, or a list typed into the tile.",
			default: [],
			writes: { list: true, create: true, update: true, remove: true, replace: verb<Row<Partial<CardRecord>>[]>() },
			describes: {
				name: { label: "Name", type: "text", required: true },
				tier: { label: "Row", type: "text", aka: ["rank", "grade", "bucket"] },
				order: { label: "Order", type: "number", aka: ["position", "sort", "index"] },
				picture: { label: "Picture", type: "text", aka: ["image", "avatar", "cover", "icon"] },
			},
		}),
		tiers: defineProp<TierRecord[]>()({
			label: "Rows",
			hint: "The rows, top to bottom. Each carries its own colour, and its name is what a card points at.",
			default: DEFAULT_TIERS,
			writes: { list: true, create: true, update: true, remove: true, replace: verb<Row<Partial<TierRecord>>[]>() },
			describes: {
				label: { label: "Name", type: "text", required: true, aka: ["name", "title", "tier"] },
				tone: { label: "Colour", type: "text", aka: ["colour", "color"] },
				order: { label: "Order", type: "number", aka: ["position", "sort", "index"] },
			},
		}),
		title: defineProp<string>()({
			label: "Title",
			default: "Tier list",
			writes: ["update"],
		}),
		cardSize: defineProp<number>()({
			label: "Card size",
			hint: "How wide one card is, in pixels. Between 32 and 160; the rows reflow around it.",
			design: true,
			default: 64,
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ cards, tiers, title, cardSize, host }) => {
	const listedCards = useData(cards.list, { limit: ALL_CARDS });
	const listedTiers = useData(tiers.list, { limit: ALL_CARDS });
	const heading = String(useData(title.get).data ?? "");
	const size = cardSizeOf(useData(cardSize.get).data);

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
				{isBroken ? <span className="wr-failure">{COULD_NOT_READ}</span> : <Board heading={heading} {...board} />}
				<Windows held={held} opened={opened} write={write} may={may} cards={cardRows.length} rows={tierRows.length} />
			</Renderer.Provider>
		</div>
	);
});

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

function useOpened() {
	const [picked, pick] = useState("");
	const [isAdding, setAdding] = useState(false);
	const [editing, setEditing] = useState<CardRow | null>(null);
	const [naming, setNaming] = useState<TierRow | null>(null);
	const [isPicking, setPicking] = useState(false);
	const [preset, setPreset] = useState<Preset | null>(null);
	const [isResetting, setResetting] = useState(false);

	return {
		picked,
		pick,
		isAdding,
		editing,
		naming,
		isPicking,
		preset,
		isResetting,
		addCard: () => setAdding(true),
		editCard: setEditing,
		nameRow: setNaming,
		pickPreset: () => setPicking(true),
		wantPreset: setPreset,
		reset: () => setResetting(true),
		closeCard: () => {
			setAdding(false);
			setEditing(null);
		},
		closeRow: () => setNaming(null),
		closePresets: () => setPicking(false),
		closeWanted: () => setPreset(null),
		closeReset: () => setResetting(false),
	};
}

function useCardWriting(held: RackView, { cards, say }: Gates) {
	const listOf = (tier: string | null) =>
		tier === null ? held.tray : (held.rack.find((line) => line.label === tier)?.cards ?? []);

	const renumberCards = async (rows: CardRow[], tier: string | null) => {
		for (const row of renumbered(rows)) await cards.update({ ref: row.ref, data: { tier, order: row.order } });
	};

	const unrank = async (rows: CardRow[]) => {
		for (const row of rows) await cards.update({ ref: row.ref, data: { tier: null, order: null } });
	};

	return {
		listOf,

		into: async (row: CardRow, target: Target) => {
			if (!canDo(cards.update)) return say(CANNOT_MOVE);
			const line = placedAt(listOf(target.tier), row, target.at);
			const at = line.findIndex((card) => card.ref === row.ref);
			const order = orderBetween(line[at - 1] ?? null, line[at + 1] ?? null);
			if (order === null) return renumberCards(line, target.tier);
			await cards.update({ ref: row.ref, data: { tier: target.tier, order } });
		},

		unorphan: () => unrank(held.orphans),

		resetRanks: () => unrank(held.rack.flatMap((line) => line.cards)),

		card: async (row: CardRow | null, draft: Draft) => {
			const data = { name: draft.name.trim(), picture: draft.picture.trim() };
			if (!data.name) return;
			if (row) {
				if (!canDo(cards.update)) return say(CANNOT_MOVE);
				await cards.update({ ref: row.ref, data });
				return;
			}
			if (!canDo(cards.create)) return say(CANNOT_ADD_CARD);
			await cards.create(data);
		},

		removeCard: async (row: CardRow) => {
			await cards.remove(row.ref);
		},
	};
}

type Rename = { standing: string[]; isRenamed: boolean; wanted: string; heldCards: number; canWriteCards: boolean };

function refusalForRename({ standing, isRenamed, wanted, heldCards, canWriteCards }: Rename) {
	if (!isRenamed) return "";
	if (isLabelTaken(standing, wanted)) return ALREADY_A_ROW;
	return heldCards > 0 && !canWriteCards ? CARDS_ARE_READ_ONLY : "";
}

function useRowWriting(held: RackView, { cards, tiers, say }: Gates, listOf: (tier: string | null) => CardRow[]) {
	const standing = held.rack.map((line) => line.label);

	const refileUnder = async (was: string, label: string) => {
		for (const row of listOf(was)) await cards.update({ ref: row.ref, data: { tier: label } });
	};

	return {
		addRow: async () => {
			if (!canDo(tiers.create)) return say(CANNOT_ADD_ROW);
			const last = held.tiers[held.tiers.length - 1];
			await tiers.create({
				label: freeLabel(standing),
				tone: nextToneAfter(toneOf(last)),
				order: held.tiers.length + 1,
			});
		},

		row: async (row: TierRow, label: string, tone: string) => {
			const was = labelOf(row);
			const wanted = label.trim();
			if (!wanted) return;
			if (!canDo(tiers.update)) return say(CANNOT_WRITE_ROW);
			const isRenamed = wanted !== was;
			const refusal = refusalForRename({
				standing,
				isRenamed,
				wanted,
				heldCards: listOf(was).length,
				canWriteCards: canDo(cards.update),
			});
			if (refusal) return say(refusal);
			await tiers.update({ ref: row.ref, data: { label: wanted, tone } });
			if (isRenamed) await refileUnder(was, wanted);
		},

		moveRow: async (row: TierRow, step: number) => {
			if (!canDo(tiers.update)) return say(CANNOT_WRITE_ROW);
			const at = held.tiers.findIndex((standingRow) => standingRow.ref === row.ref);
			const line = placedAt(held.tiers, row, at + step);
			const landing = line.findIndex((standingRow) => standingRow.ref === row.ref);
			const order = orderBetween(line[landing - 1] ?? null, line[landing + 1] ?? null);
			if (order !== null) {
				await tiers.update({ ref: row.ref, data: { order } });
				return;
			}
			for (const renumberedRow of renumbered(line))
				await tiers.update({ ref: renumberedRow.ref, data: { order: renumberedRow.order } });
		},

		removeRow: async (row: TierRow) => {
			if (!canDo(tiers.remove)) return say(CANNOT_REMOVE_ROW);
			await tiers.remove(row.ref);
		},
	};
}

function useSeeding({ cards, tiers, say }: Gates) {
	return {
		preset: async (preset: Preset) => {
			if (!canDo(tiers.replace) || !canDo(cards.replace)) return say(NO_PRESETS_HERE);
			await tiers.replace(rowsOf(DEFAULT_TIERS));
			await cards.replace(rowsOf(preset.cards));
		},
	};
}

function useWriting(held: RackView, gates: Gates) {
	const cardWriting = useCardWriting(held, gates);
	return { ...cardWriting, ...useRowWriting(held, gates, cardWriting.listOf), ...useSeeding(gates) };
}

function isWithin(box: DOMRect, x: number, y: number) {
	return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function aimedAt(root: HTMLElement | null, x: number, y: number, movedRef: string): Target | null {
	const pens = [...(root?.querySelectorAll<HTMLElement>("[data-pen]") ?? [])];
	const pen = pens.find((node) => isWithin(node.getBoundingClientRect(), x, y));
	if (!pen) return null;
	const faces = [...pen.querySelectorAll<HTMLElement>("[data-card]")].filter((node) => node.dataset.card !== movedRef);
	const at = faces.findIndex((node) => {
		const box = node.getBoundingClientRect();
		return y < box.top || (y <= box.bottom && x < box.left + box.width / 2);
	});
	const name = pen.dataset.pen ?? "";
	return { tier: name || null, at: at === -1 ? faces.length : at };
}

function useDragging(rootRef: { current: HTMLDivElement | null }, onDrop: (row: CardRow, target: Target) => void) {
	const [carry, setCarry] = useState<Carry | null>(null);
	const [target, setTarget] = useState<Target | null>(null);

	const grab = (row: CardRow) => (event: ReactPointerEvent<HTMLElement>) => {
		if (event.button !== 0) return;
		const box = event.currentTarget.getBoundingClientRect();
		const start = { x: event.clientX, y: event.clientY };
		let held: Carry = {
			row,
			x: start.x,
			y: start.y,
			offX: start.x - box.left,
			offY: start.y - box.top,
			isDragging: false,
		};
		let aimed: Target | null = null;

		const follow = (moved: PointerEvent) => {
			const isPastSlop =
				Math.abs(moved.clientX - start.x) > TAP_SLOP_PX || Math.abs(moved.clientY - start.y) > TAP_SLOP_PX;
			held = { ...held, x: moved.clientX, y: moved.clientY, isDragging: held.isDragging || isPastSlop };
			setCarry(held);
			if (!held.isDragging) return;
			aimed = aimedAt(rootRef.current, moved.clientX, moved.clientY, row.ref);
			setTarget(aimed);
		};
		const stop = () => {
			window.removeEventListener("pointermove", follow);
			window.removeEventListener("pointerup", stop);
			window.removeEventListener("pointercancel", stop);
			setCarry(null);
			setTarget(null);
			if (held.isDragging && aimed) onDrop(row, aimed);
		};

		setCarry(held);
		window.addEventListener("pointermove", follow);
		window.addEventListener("pointerup", stop);
		window.addEventListener("pointercancel", stop);
	};

	return { carry, target, grab };
}

type Dragging = ReturnType<typeof useDragging>;
type May = { preset: boolean; edit: boolean; add: boolean; addRow: boolean };

type Picking = {
	drag: Dragging;
	picked: string;
	onPressCard: (ref: string) => void;
	onEditCard: ((row: CardRow) => void) | null;
	onPlace: (tier: string | null) => void;
};

type BoardProps = {
	heading: string;
	held: RackView;
	opened: Opened;
	write: Writing;
	may: May;
	rootRef: { current: HTMLDivElement | null };
	size: number;
	cards: CardRow[];
};

function Board({ heading, held, opened, write, may, rootRef, size, cards }: BoardProps) {
	const drag = useDragging(rootRef, write.into);

	const place = (tier: string | null) => {
		const row = cards.find((card) => card.ref === opened.picked);
		opened.pick("");
		if (row) void write.into(row, { tier, at: Number.MAX_SAFE_INTEGER });
	};

	const picking = {
		drag,
		picked: opened.picked,
		onPressCard: opened.pick,
		onEditCard: may.edit ? opened.editCard : null,
		onPlace: place,
	};

	return (
		<>
			<Head heading={heading} cards={cards.length} ranked={held.ranked} may={may} opened={opened} />
			<Rack
				held={held}
				{...picking}
				onNameRow={opened.nameRow}
				onMoveRow={write.moveRow}
				onRemoveRow={write.removeRow}
				onAddRow={may.addRow ? write.addRow : null}
			/>
			<Tray
				held={held}
				{...picking}
				onAddCard={may.add ? opened.addCard : null}
				onPresets={may.preset ? opened.pickPreset : null}
				onUnorphan={may.edit ? write.unorphan : null}
			/>
			{drag.carry?.isDragging ? <Carried carry={drag.carry} size={size} /> : null}
		</>
	);
}

function Head({
	heading,
	cards,
	ranked,
	may,
	opened,
}: {
	heading: string;
	cards: number;
	ranked: number;
	may: May;
	opened: Opened;
}) {
	return (
		<div className="wr-head">
			{heading ? <span className="wr-title">{heading}</span> : null}
			<Count>{cards}</Count>
			<span className="wr-head-rest">
				{may.preset ? (
					<Button size="s" variant="accent" onClick={opened.pickPreset}>
						<ButtonLabel>Presets</ButtonLabel>
					</Button>
				) : null}
				{ranked > 0 && may.edit ? (
					<Button size="s" onClick={opened.reset}>
						<ButtonLabel>Reset</ButtonLabel>
					</Button>
				) : null}
			</span>
		</div>
	);
}

function Rack({
	held,
	onNameRow,
	onMoveRow,
	onRemoveRow,
	onAddRow,
	...picking
}: Picking & {
	held: RackView;
	onNameRow: (row: TierRow) => void;
	onMoveRow: (row: TierRow, step: number) => void;
	onRemoveRow: (row: TierRow) => void;
	onAddRow: (() => void) | null;
}) {
	const rackRef = useRef<HTMLDivElement | null>(null);
	const fogRef = useRef<HTMLDivElement | null>(null);
	useFog(rackRef, fogRef);
	const isEmpty = held.rack.length === 0;

	const addRow = onAddRow ? (
		<button type="button" className="wr-add-tier" onClick={onAddRow}>
			<Icon name="plus" size={14} />
			Add a row
		</button>
	) : null;

	return (
		<div className="wr-fog" ref={fogRef}>
			<div className="wr-rack" ref={rackRef}>
				{isEmpty ? (
					<div className="wr-empty">
						<span className="wr-empty-note">{NO_ROWS}</span>
						{addRow}
					</div>
				) : (
					held.rack.map((line, at) => (
						<div className={`wr-tier ${toneClass(line.tone)}`} key={line.row.ref}>
							<div
								className="wr-rail"
								onClick={() => (picking.picked ? picking.onPlace(line.label) : onNameRow(line.row))}
							>
								<span className="wr-rail-label">{line.label}</span>
								<span className="wr-grips">
									<Grip
										variant="is-up"
										label="Move this row up"
										isOff={at === 0}
										onPress={() => onMoveRow(line.row, -1)}
									/>
									<Grip
										variant="is-down"
										label="Move this row down"
										isTurned
										isOff={at === held.rack.length - 1}
										onPress={() => onMoveRow(line.row, 1)}
									/>
									<Grip variant="is-gone" label="Remove this row" icon="close" onPress={() => onRemoveRow(line.row)} />
								</span>
							</div>
							<Pen name={line.label} cards={line.cards} {...picking} />
						</div>
					))
				)}
				{isEmpty ? null : addRow}
			</div>
		</div>
	);
}

function Grip({
	variant,
	label,
	icon = "arrow-up",
	isOff = false,
	isTurned = false,
	onPress,
}: {
	variant: string;
	label: string;
	icon?: string;
	isOff?: boolean;
	isTurned?: boolean;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			className={`wr-grip ${variant}`}
			aria-label={label}
			disabled={isOff}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation();
				onPress();
			}}
		>
			<Icon name={icon} size={12} className={isTurned ? "wr-turned" : undefined} />
		</button>
	);
}

function useFog(rackRef: { current: HTMLElement | null }, fogRef: { current: HTMLElement | null }) {
	const paintRef = useRef<() => void>(() => {});
	paintRef.current = () => {
		const rack = rackRef.current;
		const fog = fogRef.current;
		if (!rack || !fog) return;
		const below = rack.scrollHeight - rack.clientHeight - rack.scrollTop;
		fog.style.setProperty("--wr-fog-top", String(Math.min(1, rack.scrollTop / FOG_REACH_PX)));
		fog.style.setProperty("--wr-fog-bottom", String(Math.min(1, below / FOG_REACH_PX)));
	};

	useLayoutEffect(() => {
		paintRef.current();
	});

	useLayoutEffect(() => {
		const rack = rackRef.current;
		if (!rack) return undefined;
		const paint = () => paintRef.current();
		rack.addEventListener("scroll", paint, { passive: true });
		const watcher = typeof ResizeObserver === "function" ? new ResizeObserver(paint) : null;
		watcher?.observe(rack);
		return () => {
			rack.removeEventListener("scroll", paint);
			watcher?.disconnect();
		};
	}, []);
}

function slotIndex(drag: Dragging, name: string | null, shown: number) {
	if (!drag.carry?.isDragging || drag.target?.tier !== name) return -1;
	return Math.min(drag.target?.at ?? shown, shown);
}

function Pen({
	name,
	cards,
	drag,
	picked,
	onPressCard,
	onEditCard,
	onPlace,
	after,
}: Picking & { name: string | null; cards: CardRow[]; after?: ReactNode }) {
	const carried = drag.carry?.isDragging ? drag.carry.row.ref : "";
	const shown = cards.filter((row) => row.ref !== carried);
	const slotAt = slotIndex(drag, name, shown.length);

	return (
		<div
			className={`wr-pen${slotAt === -1 ? "" : " is-target"}`}
			data-pen={name ?? ""}
			onClick={() => (picked ? onPlace(name) : undefined)}
		>
			{shown.map((row, at) => (
				<Fragment key={row.ref}>
					{slotAt === at ? <span className="wr-slot" /> : null}
					<Card row={row} drag={drag} isPicked={picked === row.ref} onPress={onPressCard} onEdit={onEditCard} />
				</Fragment>
			))}
			{slotAt === shown.length ? <span className="wr-slot" /> : null}
			{after}
		</div>
	);
}

function Card({
	row,
	drag,
	isPicked,
	onPress,
	onEdit,
}: {
	row: CardRow;
	drag: Dragging;
	isPicked: boolean;
	onPress: (ref: string) => void;
	onEdit: ((row: CardRow) => void) | null;
}) {
	return (
		<div
			className={`wr-card${isPicked ? " is-picked" : ""}`}
			data-card={row.ref}
			onPointerDown={drag.grab(row)}
			onClick={(event) => {
				event.stopPropagation();
				onPress(isPicked ? "" : row.ref);
			}}
		>
			<Face card={row} />
			<span className="wr-cap">{nameOf(row)}</span>
			{onEdit ? (
				<button
					type="button"
					className="wr-edit"
					aria-label="Edit this card"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						onEdit(row);
					}}
				>
					<Icon name="pencil" size={12} />
				</button>
			) : null}
		</div>
	);
}

function Face({ card }: { card: CardRecord }) {
	const drawn = pictureOf(card) as Picture;
	const [hasFailed, setFailed] = useState(false);
	const tone = drawn.kind === "emoji" ? "neutral" : toneForSeed(nameOf(card));
	const face = (held: ReactNode) => <span className={`wr-face ${toneClass(tone)}`}>{held}</span>;

	if (drawn.kind === "emoji") return face(<Emoji name={drawn.name} size={34} />);
	if (drawn.kind === "remote" && !hasFailed)
		return face(<img src={drawn.src} alt="" draggable={false} onError={() => setFailed(true)} />);
	if (drawn.kind === "vault") return face(<Attachment markdown={drawn.markdown} letters={drawn.letters} />);
	return face(drawn.letters);
}

function Attachment({ markdown, letters }: { markdown: string; letters: string }) {
	const render = useContext(Renderer);
	const holder = useRef<HTMLSpanElement | null>(null);
	const renderRef = useRef<RenderMarkdown | null>(render);
	renderRef.current = render;

	useEffect(() => {
		const node = holder.current;
		const draw = renderRef.current;
		if (!node || !draw) return undefined;
		return draw(node, markdown);
	}, [markdown]);

	return (
		<span className="wr-picture" ref={holder}>
			{render ? null : letters}
		</span>
	);
}

function Carried({ carry, size }: { carry: Carry; size: number }) {
	const tone = toneForSeed(nameOf(carry.row));
	return createPortal(
		<div
			className={`wg-portal wg-rank wr-carried ${toneClass(tone)}`}
			style={
				{
					left: `${carry.x - carry.offX}px`,
					top: `${carry.y - carry.offY}px`,
					"--wg-rank-card": `${size}px`,
				} as Record<string, string>
			}
		>
			<Face card={carry.row} />
		</div>,
		document.body,
	);
}

function Orphans({
	rows,
	drag,
	picked,
	onPressCard,
	onEditCard,
	onUnorphan,
}: Omit<Picking, "onPlace"> & { rows: CardRow[]; onUnorphan: (() => void) | null }) {
	return (
		<div className="wr-orphans">
			<div className="wr-orphan-head">
				<Icon name="archive" size={13} />
				{ORPHANS_SAID}
				<Count>{rows.length}</Count>
				{onUnorphan ? (
					<Button size="s" variant="plain" onClick={onUnorphan}>
						<ButtonLabel>{ORPHANS_ACTION}</ButtonLabel>
					</Button>
				) : null}
			</div>
			<div className="wr-tray-row">
				{rows.map((row) => (
					<Card
						key={row.ref}
						row={row}
						drag={drag}
						isPicked={picked === row.ref}
						onPress={onPressCard}
						onEdit={onEditCard}
					/>
				))}
			</div>
		</div>
	);
}

function Tray({
	held,
	onAddCard,
	onPresets,
	onUnorphan,
	...picking
}: Picking & {
	held: RackView;
	onAddCard: (() => void) | null;
	onPresets: (() => void) | null;
	onUnorphan: (() => void) | null;
}) {
	const isEmpty = held.tray.length === 0 && !picking.drag.carry;
	const hasNothing = held.tray.length + held.orphans.length + held.ranked === 0;

	return (
		<div className="wr-tray">
			{held.orphans.length > 0 ? (
				<Orphans
					rows={held.orphans}
					onUnorphan={onUnorphan}
					drag={picking.drag}
					picked={picking.picked}
					onPressCard={picking.onPressCard}
					onEditCard={picking.onEditCard}
				/>
			) : null}

			<div className="wr-tray-head">
				<span className="wr-tray-label">Unranked</span>
				<Count>{held.tray.length}</Count>
			</div>

			<div className="wr-tray-row">
				<Pen
					name={null}
					cards={held.tray}
					{...picking}
					after={
						onAddCard ? (
							<button type="button" className="wr-add-card" aria-label="Add a card" onClick={onAddCard}>
								<Icon name="plus" size={18} />
							</button>
						) : null
					}
				/>
			</div>

			{isEmpty ? <TrayEmpty hasNothing={hasNothing} onAddCard={onAddCard} onPresets={onPresets} /> : null}
		</div>
	);
}

function TrayEmpty({
	hasNothing,
	onAddCard,
	onPresets,
}: {
	hasNothing: boolean;
	onAddCard: (() => void) | null;
	onPresets: (() => void) | null;
}) {
	return (
		<div className="wr-empty-rest">
			<span className="wr-tray-say">{hasNothing ? NOTHING_TO_RANK : EVERYTHING_RANKED}</span>
			{hasNothing && onAddCard ? (
				<Button size="s" onClick={onAddCard}>
					<Icon name="plus" size={14} />
					<ButtonLabel>Add a card</ButtonLabel>
				</Button>
			) : null}
			{hasNothing && onPresets ? (
				<Button size="s" variant="accent" onClick={onPresets}>
					<ButtonLabel>Presets</ButtonLabel>
				</Button>
			) : null}
		</div>
	);
}

function Windows({
	held,
	opened,
	write,
	may,
	cards,
	rows,
}: {
	held: RackView;
	opened: Opened;
	write: Writing;
	may: May;
	cards: number;
	rows: number;
}) {
	const namedCards = opened.naming
		? (held.rack.find((line) => line.row.ref === opened.naming?.ref)?.cards.length ?? 0)
		: 0;

	return (
		<>
			<CardDialog
				isOpen={opened.isAdding || Boolean(opened.editing)}
				row={opened.editing}
				onClose={opened.closeCard}
				onSave={(draft: Draft) => {
					const kept = opened.editing;
					opened.closeCard();
					void write.card(kept, draft);
				}}
				onRemove={
					opened.editing && may.edit
						? () => {
								const kept = opened.editing as CardRow;
								opened.closeCard();
								void write.removeCard(kept);
							}
						: null
				}
			/>

			<RowDialog
				row={opened.naming}
				heldCards={namedCards}
				onClose={opened.closeRow}
				onSave={(label: string, tone: string) => {
					const kept = opened.naming;
					opened.closeRow();
					if (kept) void write.row(kept, label, tone);
				}}
			/>

			<PresetDialog isOpen={opened.isPicking} onClose={opened.closePresets} onPick={opened.wantPreset} />
			<Asks opened={opened} write={write} ranked={held.ranked} cards={cards} rows={rows} />
		</>
	);
}

function Asks({
	opened,
	write,
	ranked,
	cards,
	rows,
}: {
	opened: Opened;
	write: Writing;
	ranked: number;
	cards: number;
	rows: number;
}) {
	return (
		<>
			<ConfirmDialog
				isOpen={Boolean(opened.preset)}
				onOpenChange={opened.closeWanted}
				className="wg-rank"
				variant="accent"
				confirmLabel={REPLACE_CONFIRM}
				title={REPLACE_TITLE.replace("{name}", opened.preset?.name ?? "")}
				description={REPLACE_SAID.replace("{cards}", String(cards)).replace("{rows}", String(rows))}
				onConfirm={() => {
					const kept = opened.preset as Preset;
					opened.closeWanted();
					opened.closePresets();
					void write.preset(kept);
				}}
			/>

			<ConfirmDialog
				isOpen={opened.isResetting}
				onOpenChange={opened.closeReset}
				className="wg-rank"
				variant="danger"
				confirmLabel={RESET_CONFIRM}
				title={RESET_TITLE.replace("{count}", String(ranked))}
				description={RESET_SAID}
				onConfirm={() => {
					opened.closeReset();
					void write.resetRanks();
				}}
			/>
		</>
	);
}

function PresetDialog({
	isOpen,
	onClose,
	onPick,
}: {
	isOpen: boolean;
	onClose: () => void;
	onPick: (preset: Preset) => void;
}) {
	return (
		<Dialog isOpen={isOpen} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="40rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>{PRESET_TITLE}</DialogTitle>
					<DialogDescription>{PRESET_SAID}</DialogDescription>
				</DialogHeader>
				<div className="wr-gallery">
					{PRESETS.map((preset) => (
						<button type="button" className="wr-preset" key={preset.id} onClick={() => onPick(preset)}>
							<span className="wr-preset-name">{preset.name}</span>
							<span className="wr-preset-mini">
								{DEFAULT_TIERS.map((tier) => (
									<i className={`wr-preset-chip ${toneClass(toneOf(tier))}`} key={labelOf(tier)} />
								))}
							</span>
							<span className="wr-preset-where">
								{CARDS_COUNTED.replace("{count}", String(preset.cards.length))}
								{preset.needsTheWeb ? ` · ${PRESET_NEEDS_WEB}` : ""}
							</span>
						</button>
					))}
				</div>
				{PRESETS.filter((preset) => preset.credit).map((preset) => (
					<p className="wr-credit" key={preset.id}>
						{preset.credit}
					</p>
				))}
			</DialogContent>
		</Dialog>
	);
}

function CardDialog({
	isOpen,
	row,
	onClose,
	onSave,
	onRemove,
}: {
	isOpen: boolean;
	row: CardRow | null;
	onClose: () => void;
	onSave: (draft: Draft) => void;
	onRemove: (() => void) | null;
}) {
	const [draft, setDraft] = useState<Draft>({ name: "", picture: "" });

	useEffect(() => {
		if (!isOpen) return;
		setDraft({ name: row ? nameOf(row) : "", picture: row ? String(row.picture ?? "") : "" });
	}, [isOpen, row?.ref]);

	return (
		<Dialog isOpen={isOpen} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="26rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>{row ? "Edit this card" : "Add a card"}</DialogTitle>
					<DialogDescription>{CARD_PICTURE_SAID}</DialogDescription>
				</DialogHeader>
				<div className="wr-pop">
					<Field value={draft.name} placeholder="Name" onInput={(next: string) => setDraft({ ...draft, name: next })} />
					<Field
						value={draft.picture}
						placeholder="Picture"
						onInput={(next: string) => setDraft({ ...draft, picture: next })}
					/>
				</div>
				<DialogFooter>
					{onRemove ? (
						<Button size="s" variant="danger" onClick={onRemove}>
							<ButtonLabel>Remove</ButtonLabel>
						</Button>
					) : null}
					<Button size="s" onClick={onClose}>
						<ButtonLabel>Cancel</ButtonLabel>
					</Button>
					<Button size="s" variant="accent" onClick={() => onSave(draft)}>
						<ButtonLabel>{row ? "Save" : "Add card"}</ButtonLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RowDialog({
	row,
	heldCards,
	onClose,
	onSave,
}: {
	row: TierRow | null;
	heldCards: number;
	onClose: () => void;
	onSave: (label: string, tone: string) => void;
}) {
	const [label, setLabel] = useState("");
	const [tone, setTone] = useState("neutral");

	useEffect(() => {
		if (!row) return;
		setLabel(labelOf(row));
		setTone(toneOf(row));
	}, [row?.ref]);

	return (
		<Dialog isOpen={Boolean(row)} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="24rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>Row</DialogTitle>
					<DialogDescription>{RENAME_REWRITES.replace("{count}", String(heldCards))}</DialogDescription>
				</DialogHeader>
				<div className="wr-pop">
					<Field value={label} placeholder="Name" onInput={setLabel} />
					<p className="wr-pop-hint">{EIGHT_COLOURS}</p>
					<div className="wr-swatches">
						{TONE_NAMES.map((name: string) => (
							<button
								type="button"
								key={name}
								aria-label={name}
								className={`wr-swatch ${toneClass(name)}${name === tone ? " is-on" : ""}`}
								onClick={() => setTone(name)}
							/>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button size="s" onClick={onClose}>
						<ButtonLabel>Cancel</ButtonLabel>
					</Button>
					<Button size="s" variant="accent" onClick={() => onSave(label, tone)}>
						<ButtonLabel>Save</ButtonLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
