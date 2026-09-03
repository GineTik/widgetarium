import { canDo, createWidget, WidgetRoot, ConfirmDialog, flatRows, pickedValue, useData } from "widgetarium";
import { archivedColumnsFor, boardWriter, readBoardRecord } from "@task/lib";
import { Button, Card, Count, Icon, Plate } from "widgetarium/kit";
import { useEffect, useMemo, useRef, useState } from "react";

type RecordRow = { ref: string; value: { path?: string; props?: Record<string, any>; name?: string; attachments?: number } };


// CONTEXT: authored whole, filled by replace — a built sentence cannot be reordered
const ARCHIVE_TITLE = "Archive {name}?";
const ARCHIVE = "Archive";
const REPAIR_BOARDS = "Repair duplicate ids";
const REPAIR_TITLE = "Repair duplicate ids?";
const REPAIR_ONE = "One board shares its id with another. The board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR_MANY = "{count} boards share an id with another. In each pair the board whose path sorts first keeps it; the other is given a new one. Nothing else in either note changes.";
const REPAIR = "Repair";

const CSS = `
.ok-board {
	display: flex;
	align-items: flex-start;
	gap: var(--size-4-3, 12px);
	height: 100%;
	padding-bottom: var(--size-4-1, 4px);
	overflow-x: auto;
	overflow-y: auto;
	box-sizing: border-box;
}
.ok-board * { box-sizing: border-box; }

.ok-empty {
	margin: 0;
	padding: var(--size-4-6, 24px);
	font-size: var(--font-ui-small, 14px);
	color: var(--text-faint);
}

/* CONTEXT: the kit plate carries fill, radius and pad; the reference's tight gap is 6px */
/* CONTEXT: the reference's 268 plus 10% — a two-line title and four circles need the room */
.orbi-kanban .ok-list {
	flex: 0 0 296px;
	gap: var(--size-2-3, 6px);
}

.orbi-kanban .ok-list.is-over { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

.ok-list-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
}

/* CONTEXT: the head is the grip — the body below it is full of cards that drag on their own */
.orbi-kanban .ok-list-head[draggable="true"] { cursor: grab; }
.orbi-kanban .ok-list-head[draggable="true"]:active { cursor: grabbing; }

/* TRADE-OFF: the columns are TRANSLATED, never reordered mid-drag — a moving DOM changes what
   the pointer is over, and the aim then oscillates between two neighbours */
.orbi-kanban .ok-board.is-dragging .ok-list { transition: transform var(--orbi-quick) var(--orbi-ease); }

/* CONTEXT: the plate's own fill and radius ARE the landing block; hidden children keep its size */
.orbi-kanban .ok-list.is-placeholder > * { visibility: hidden; }

.ok-list-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-kanban .ok-list-title[contenteditable="true"]:focus {
	outline: none;
	border-bottom: 1px solid var(--interactive-accent);
	cursor: text;
}

/* CONTEXT: no counterpart in the reference — sized to the count, hover ground from .addrow:hover */
.orbi-kanban .ok-list-remove {
	display: grid;
	place-items: center;
	width: 24px;
	height: 24px;
	margin-left: auto;
	color: var(--text-muted);
	opacity: 0;
	transition: opacity var(--orbi-quick) var(--orbi-ease);
}

.orbi-kanban .ok-list-remove::before { border-radius: var(--wg-kit-pill); }

.orbi-kanban .ok-list:hover .ok-list-remove,
.orbi-kanban .ok-list-remove:focus-visible { opacity: 1; }

.orbi-kanban .ok-list-remove:hover { color: var(--text-normal); }
.orbi-kanban .ok-list-remove:hover::before { background: var(--background-modifier-hover); }

.orbi-kanban .ok-card-slot { cursor: grab; border-radius: var(--wg-kit-item); }
.orbi-kanban .ok-card-slot:active { cursor: grabbing; }
.orbi-kanban .ok-card-slot.is-open > * { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

/* TRADE-OFF: text only, no fill and no border — a plate is the last background on this board */
.orbi-kanban .ok-add-task {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px);
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-task::before { border-radius: var(--wg-kit-item); }

.orbi-kanban .ok-add-task:hover { color: var(--text-normal); }

/* the composer stands where the button stood, inside the column, not in a plate of its own */
.orbi-kanban .ok-add-task-open {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-2-3, 6px);
}

.orbi-kanban .ok-task-name {
	height: 34px;
	padding: 0 var(--size-4-3, 12px);
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-pill);
	background: var(--background-primary);
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-normal);
	outline: none;
}

.orbi-kanban .ok-task-name::placeholder { color: var(--text-faint); }
.orbi-kanban .ok-add-task:hover::before { background: var(--background-modifier-hover); }

/* CONTEXT: drawn only when the card slot holds no widget; the kit card carries fill and radius */
.orbi-kanban .ok-card { padding: var(--size-4-3, 12px); }

.ok-card-title {
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-normal);
}

/* TRADE-OFF: the plate shape at rest, so the place a new list lands is already drawn */
/* CONTEXT: Plate puts a kit class on this button, which excludes it from the suite's reset —
   so the plate's own fill and corner are re-laid on ::before, out of the host's reach. */
.orbi-kanban .ok-add-list-rest {
	position: relative;
	isolation: isolate;
	flex: 0 0 296px;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	height: 48px;
	appearance: none;
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-medium, 500);
	color: var(--text-muted);
	cursor: pointer;
}

.orbi-kanban .ok-add-list-rest::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
	border-radius: var(--wg-kit-plate);
	background: var(--wg-kit-fill);
}

.orbi-kanban .ok-add-list-rest:hover { color: var(--text-normal); }

.orbi-kanban .ok-add-list { flex: 0 0 296px; }

/* CONTEXT: the reference's .search, at the height a plate wants and on the card's own fill */
.orbi-kanban .ok-list-name {
	height: 34px;
	padding: 0 var(--size-4-3, 12px);
	appearance: none;
	border: none;
	border-radius: var(--wg-kit-pill);
	background: var(--background-primary);
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-normal);
	outline: none;
}

.orbi-kanban .ok-list-name::placeholder { color: var(--text-faint); }

.ok-add-list-actions {
	display: flex;
	gap: var(--size-4-2, 8px);
}

.ok-cancel { flex: 1 1 0; }
.ok-confirm { flex: 1 1 0; }

@container widget (width < 420px) {
	.orbi-kanban .ok-list,
	.orbi-kanban .ok-add-list,
	.orbi-kanban .ok-add-list-rest { flex: 0 0 284px; }
}

/* CONTEXT: the move is offered once and disappears — a dashed plate says it is not a list */
.orbi-kanban .ok-move-boards::before { border: 1px dashed var(--background-modifier-border); }
.orbi-kanban .ok-repair-ids::before { border: 1px dashed var(--background-modifier-border); }

/* CONTEXT: the dialog is portalled onto <body>, out of reach of the widget root's class */
.wg-dialog.ok-archive,
.wg-dialog.ok-move-boards-ask { width: min(420px, 100%); }
.wg-dialog.ok-repair-ids-ask { width: min(420px, 100%); }
`;

// TRADE-OFF: the task-card widget owns the card; this draws a title when the slot is empty
function FallbackCard({ task }) {
	return (
		<Card className="ok-card">
			<span className="ok-card-title">{task.title}</span>
		</Card>
	);
}

function KanbanList({ title, rows, cards, CardSlot, onAdd, onArchive, onRename, onOpen, onDropTask, onGrab, onRelease, shift, placeholder, canWrite, dragging, opened }) {
	const CardComponent = CardSlot ?? FallbackCard;
	const [isOver, setOver] = useState(false);
	// CONTEXT: a grip around an editable heading steals the drag that selects its text
	const [isRenaming, setRenaming] = useState(false);

	return (
		<Plate
			className={`ok-list${isOver ? " is-over" : ""}${placeholder ? " is-placeholder" : ""}`}
			style={shift === undefined ? null : { transform: `translateX(${shift}px)` }}
			onDragOver={(event) => {
				if (!dragging?.row) return;
				event.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event) => {
				event.preventDefault();
				setOver(false);
				onDropTask?.();
			}}
		>
			<div className="ok-list-head" draggable={Boolean(onGrab) && !isRenaming} onDragStart={onGrab} onDragEnd={onRelease}>
				<span
					className="ok-list-title"
					// CONTEXT: the lowercase attribute — a property some engines never mirror back is unreadable
					contentEditable={onRename ? "true" : undefined}
					suppressContentEditableWarning
					onFocus={() => setRenaming(true)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							event.currentTarget.blur();
						}
						if (event.key === "Escape") {
							event.currentTarget.textContent = title;
							event.currentTarget.blur();
						}
					}}
					onBlur={(event) => {
						setRenaming(false);
						onRename?.(event.currentTarget.textContent);
					}}
				>
					{title}
				</span>
				<Count>{rows.length}</Count>
				{onArchive ? (
					<button type="button" className="ok-list-remove" title={`Archive ${title}`} onClick={onArchive}>
						<Icon name="archive" size={15} />
					</button>
				) : null}
			</div>

			{cards.map((task, index) => (
				<div
					key={rows[index]?.ref ?? index}
					className={`ok-card-slot${rows[index]?.ref === opened ? " is-open" : ""}`}
					draggable={canWrite}
					onDragStart={() => dragging?.pick(rows[index])}
					onDragEnd={() => dragging?.drop()}
					onClick={() => onOpen?.(rows[index])}
				>
					<CardComponent task={task} />
				</div>
			))}

			{canWrite ? <AddTask onAdd={onAdd} /> : null}
		</Plate>
	);
}

// TRADE-OFF: the same shape as AddList, not the same component — a list is named in a plate of
// its own, a task is named inside the column it will land in
function AddTask({ onAdd }) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState("");

	const confirm = () => {
		const trimmed = name.trim();
		if (trimmed) onAdd?.(trimmed);
		setName("");
		setOpen(false);
	};

	if (!isOpen) {
		return (
			<button type="button" className="ok-add-task" onClick={() => setOpen(true)}>
				<Icon name="plus" size={16} />
				<span>Add new task</span>
			</button>
		);
	}

	return (
		<div className="ok-add-task-open">
			<input
				className="ok-task-name"
				ref={(node) => node?.focus()}
				placeholder="Enter task name..."
				value={name}
				onInput={(event) => setName(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") confirm();
					if (event.key === "Escape") setOpen(false);
				}}
			/>
			<div className="ok-add-list-actions">
				<Button className="ok-cancel" size="s" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button className="ok-confirm" size="s" variant="accent" onClick={confirm}>
					Add
				</Button>
			</div>
		</div>
	);
}

function AddList({ onAdd }) {
	const [isOpen, setOpen] = useState(false);
	const [name, setName] = useState("");

	if (!isOpen) {
		return (
			<Plate asChild>
				<button type="button" className="ok-add-list-rest" onClick={() => setOpen(true)}>
					<Icon name="plus" size={16} />
					<span>Add List</span>
				</button>
			</Plate>
		);
	}

	const confirm = () => {
		const trimmed = name.trim();
		if (trimmed) onAdd?.(trimmed);
		setName("");
		setOpen(false);
	};

	return (
		<Plate className="ok-add-list">
			<input
				className="ok-list-name"
				// CONTEXT: the field appeared because it was asked for; a click to reach it is one step too many
				ref={(node) => node?.focus()}
				placeholder="Enter list name..."
				value={name}
				onInput={(event) => setName(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") confirm();
					if (event.key === "Escape") setOpen(false);
				}}
			/>
			<div className="ok-add-list-actions">
				<Button className="ok-cancel" size="s" onClick={() => setOpen(false)}>
					Cancel
				</Button>
				<Button className="ok-confirm" size="s" variant="accent" onClick={confirm}>
					Add
				</Button>
			</div>
		</Plate>
	);
}

// CONTEXT: columns are the values of ONE property — groupBy regroups the same rows
// CONTEXT: a value a note names is a column of its own, so an archived one walks back unless refused
function toColumns(rows, columnNames, groupBy, archived) {
	const byName = new Map(columnNames.map((name) => [name, []]));
	for (const row of rows) {
		const value = row.props?.[groupBy] ?? columnNames[0];
		if (archived.includes(value)) continue;
		if (!byName.has(value)) byName.set(value, []);
		byName.get(value).push(row);
	}
	return [...byName.entries()].map(([title, items]) => ({ title, rows: items }));
}

// CONTEXT: an archived name keeps its slot, so a restore returns the column to where it sat
function afterColumnMoves(authored, shown, from, to) {
	const order = shown.filter((_, index) => index !== from);
	order.splice(to, 0, shown[from]);
	const moved = order[Symbol.iterator]();
	return authored.map((name) => (shown.includes(name) ? moved.next().value : name));
}

// CONTEXT: the first free number, so a column leaving does not hand out a name already in use
function freeUntitled(taken) {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// TRADE-OFF: the year only when it is not this one — a deadline this year reads as "31 Aug",
// and one in another year has to say which, or the card is quietly wrong about a whole year
function dateLabel(value, now) {
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

// CONTEXT: a note spells its own keys, and a board may have named the property either way
function valueOf(props, name) {
	const wanted = name.toLowerCase();
	const found = Object.keys(props).find((key) => key.toLowerCase() === wanted);
	return found === undefined ? undefined : props[found];
}

// TRADE-OFF: nothing invented — an absent field must stay absent, or the card cannot tell it from a value
// The strip carries FACTS THE NOTE HAS: the deadline it names and the files it embeds. Comments
// and a checklist were drawn from properties nothing writes, so every card claimed 0 of each.
function toCard(row, now) {
	const props = row.props ?? {};
	// the DEADLINE, and nothing standing in for it — a note with no deadline shows no date
	const deadline = valueOf(props, "deadline");
	return {
		title: props.title ?? row.name,
		tags: toList(valueOf(props, "tags")),
		tagTones: valueOf(props, "tagTones"),
		priority: props.priority,
		status: props.approval,
		progress: props.progress,
		initials: toList(props.assignees),
		due: deadline === undefined || deadline === null || deadline === "" ? undefined : dateLabel(deadline, now),
		files: row.attachments > 0 ? row.attachments : undefined,
	};
}

function toList(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export default createWidget(function KanbanBoard({ settings, slots, tasks, boards, selection, opened, host, configure, board, configureBoard }: any) {
	// CONTEXT: one clock for the whole board, so two cards cannot disagree about which year it is
	const today = useMemo(() => new Date(), []);
	const onBoard = pickedValue(useData(selection.get).data);
	const openedRef = useData(opened.get).data;
	const tasksData = useData(tasks.list);
	const boardsData = useData(boards.list);
	const boardRows = useMemo(() => flatRows(boardsData.rows as RecordRow[]), [boardsData.rows]);
	const allTasks = useMemo(() => flatRows(tasksData.rows as RecordRow[]), [tasksData.rows]);
	// THE BOARD'S OWN RECORD. Its columns, their order and which of them are archived belong to
	// the board, so a column added here cannot land on the board next door. A board with no file
	// yet answers from the tile and the note, exactly as it did before.
	const fromTheBoard = archivedColumnsFor(board?.archivedColumnsByBoard, onBoard, onBoard);
	const record = readBoardRecord(boardRows, { name: onBoard }, {
		columns: settings.columns,
		archivedColumns: fromTheBoard.length > 0 ? fromTheBoard : settings.archivedColumns,
	});
	const archivedColumns = record.archivedColumns;
	// CONTEXT: deduped, so a rendered index below the count IS the index in this list
	// CONTEXT: an archived name stays authored, so restoring it is not a guess about where it belonged
	// CONTEXT: a column archived before the record existed is named nowhere else
	const authoredColumns = [...new Set([...record.columns, ...archivedColumns])];
	// CONTEXT: the record once it has a file, the note until then — one writer either way
	const saveColumns = boardWriter(record, boards, {
		columns: (names: string[]) => configure?.({ columns: names.join(", ") }),
		archivedColumns: (names: string[]) => configureBoard?.({ archivedColumns: names, board: onBoard }),
	});
	const shownColumns = authoredColumns.filter((name) => !archivedColumns.includes(name));
	// CONTEXT: a board with no columns is not a board — the last one out leaves a fresh one behind
	const columnNames = shownColumns.length > 0 ? shownColumns : [freeUntitled([...authoredColumns, ...archivedColumns])];
	const groupBy = settings.groupBy || "status";
	const rows = allTasks;
	const canCreateTask = canDo(tasks.create);
	const canUpdateTask = canDo(tasks.update);
	const columns = toColumns(rows, columnNames, groupBy, archivedColumns);
	const [archiving, setArchiving] = useState(null);
	const heldByArchiving = columns.find((column) => column.title === archiving)?.rows.length ?? 0;

	// CONTEXT: found on the read and only reported — the re-mint is this press
	const duplicates = (boardsData.data as { duplicates?: { remints: string[] }[] } | null)?.duplicates ?? [];
	const remintCount = duplicates.reduce((count, entry) => count + entry.remints.length, 0);
	const canRepairIds = canDo(boards.repairIds) && remintCount > 0;
	const [isRepairingIds, setRepairingIds] = useState(false);

	const repairIds = async () => {
		setRepairingIds(false);
		await boards.repairIds();
	};

	// CONTEXT: a column is a setting, not a task — adding one must not invent a note
	// CONTEXT: naming an archived list is how it is restored, or the added one would never show
	const addList = (name) => {
		const trimmed = String(name ?? "").trim();
		if (!trimmed || shownColumns.includes(trimmed)) return;
		if (archivedColumns.includes(trimmed)) {
			// CONTEXT: a column the old map archived is authored nowhere, so restoring has to author it
			saveColumns({ archivedColumns: archivedColumns.filter((column) => column !== trimmed), columns: authoredColumns });
			return;
		}
		saveColumns({ columns: [...authoredColumns, trimmed] });
	};

	// CONTEXT: what files a task under a heading is the property in its note, so a rename must reach both
	const renameList = async (was, next) => {
		const name = String(next ?? "").trim();
		if (!name || name === was) return;
		if (columnNames.includes(name) || archivedColumns.includes(name)) {
			host?.ui?.notify(`"${name}" is already a list`);
			return;
		}

		const renamed = authoredColumns.includes(was)
			? authoredColumns.map((column) => (column === was ? name : column))
			: [...authoredColumns, name];
		saveColumns({ columns: renamed });

		const held = rows.filter((row) => (row.props?.[groupBy] ?? "") === was);
		if (held.length === 0 || !canUpdateTask) return;
		for (const row of held) await tasks.update({ ref: row.ref, data: { props: { [groupBy]: name } } });
	};

	// CONTEXT: the one place a column leaves the board; nothing is unnamed, so a restore is lossless
	const archiveList = (name) => {
		saveColumns({ archivedColumns: [...archivedColumns, name] });
		setArchiving(null);
	};

	// CONTEXT: a joined string, not the array — a fresh array every render notifies forever
	const [carried, setCarried] = useState(null);
	const dragging = {
		row: carried,
		pick: (row) => setCarried(row),
		drop: () => setCarried(null),
	};

	const boardRef = useRef(null);
	const [reorder, setReorder] = useState(null);

	// TRADE-OFF: one step and one origin, not a rect per column — every column is the same width
	const grabColumn = (from) => (event) => {
		const strip = boardRef.current;
		const lists = [...strip.querySelectorAll(".ok-list")];
		const first = lists[0].getBoundingClientRect();
		const carriedRect = lists[from].getBoundingClientRect();
		event.dataTransfer?.setDragImage?.(lists[from], event.clientX - carriedRect.left, event.clientY - carriedRect.top);
		const carrying = {
			from,
			to: from,
			step: lists[1] ? lists[1].getBoundingClientRect().left - first.left : first.width,
			origin: first.left - strip.getBoundingClientRect().left + strip.scrollLeft,
		};
		// CONTEXT: the browser paints the drag image after this handler, so the column empties a frame later
		requestAnimationFrame(() => setReorder(carrying));
	};

	// CONTEXT: content coordinates, so scrolling the board mid-drag does not shift the aim
	const aimColumn = (event) => {
		if (!reorder) return;
		event.preventDefault();
		const strip = boardRef.current;
		const x = event.clientX - strip.getBoundingClientRect().left + strip.scrollLeft;
		const wanted = Math.floor((x - reorder.origin) / reorder.step);
		const to = Math.max(0, Math.min(columnNames.length - 1, wanted));
		if (to !== reorder.to) setReorder({ ...reorder, to });
	};

	const dropColumn = () => {
		if (!reorder) return;
		if (reorder.to !== reorder.from) {
			saveColumns({ columns: afterColumnMoves(authoredColumns, columnNames, reorder.from, reorder.to) });
		}
		setReorder(null);
	};

	const shiftOf = (index) => {
		if (!reorder) return undefined;
		if (index === reorder.from) return (reorder.to - reorder.from) * reorder.step;
		if (index > reorder.from && index <= reorder.to) return -reorder.step;
		if (index < reorder.from && index >= reorder.to) return reorder.step;
		return 0;
	};

	const addTask = async (column, title) => {
		if (!canCreateTask) return;
		// CONTEXT: without an order of its own a new task sorts last by accident, and the first edit moves it
		const lastOrder = rows.reduce((highest, row) => Math.max(highest, Number(row.props?.order) || 0), 0);
		await tasks.create({
			props: {
				title,
				[groupBy]: column,
				board: onBoard,
				order: lastOrder + 1,
				progress: 0,
				priority: "P2",
			},
		});
	};

	// CONTEXT: the vault's own subscription brings the board back updated
	const moveTask = async (column) => {
		if (!carried || !canUpdateTask) return;
		if ((carried.props?.[groupBy] ?? "") === column) return;
		await tasks.update({ ref: carried.ref, data: { props: { [groupBy]: column } } });
		setCarried(null);
	};

	if (tasksData.isLoading && rows.length === 0) {
		return (
			<WidgetRoot defaultRounded="none" className="orbi orbi-kanban" defaultBackgroundType="none">
				<style>{CSS}</style>
				<p className="ok-empty">Loading tasks…</p>
			</WidgetRoot>
		);
	}

	return (
		<WidgetRoot defaultRounded="none" className="orbi orbi-kanban" defaultBackgroundType="none">
			<style>{CSS}</style>
			<div
				className={`ok-board${reorder ? " is-dragging" : ""}`}
				ref={boardRef}
				onDragOver={aimColumn}
				onDrop={dropColumn}
			>
				{columns.map((column, index) => (
					<KanbanList
						key={column.title}
						title={column.title}
						rows={column.rows}
						cards={column.rows.map((row) => toCard(row, today))}
						CardSlot={slots?.card}
						canWrite={canCreateTask}
						dragging={dragging}
						shift={shiftOf(index)}
						placeholder={reorder?.from === index}
						onGrab={configure && index < columnNames.length ? grabColumn(index) : undefined}
						onRelease={() => setReorder(null)}
						onAdd={(title) => addTask(column.title, title)}
						onArchive={configure ? () => setArchiving(column.title) : undefined}
						onRename={configure ? (next) => renameList(column.title, next) : undefined}
						onOpen={(row) => opened.update(row.ref)}
						onDropTask={() => moveTask(column.title)}
						opened={openedRef}
					/>
				))}
				{configure ? <AddList onAdd={addList} /> : null}
				{canRepairIds ? (
					<Plate asChild>
						<button type="button" className="ok-add-list-rest ok-repair-ids" onClick={() => setRepairingIds(true)}>
							<Icon name="folder" size={16} />
							<span>{REPAIR_BOARDS}</span>
						</button>
					</Plate>
				) : null}
			</div>

			<ConfirmDialog
				isOpen={Boolean(archiving)}
				onOpenChange={() => setArchiving(null)}
				className="ok-archive"
				variant="accent"
				confirmLabel={ARCHIVE}
				title={ARCHIVE_TITLE.replace("{name}", archiving)}
				description={
					<>
						The list leaves the board. Its {heldByArchiving} task{heldByArchiving === 1 ? "" : "s"} keep their{" "}
						{groupBy} property, so nothing in the notes changes and restoring the list brings them all back.
					</>
				}
				onConfirm={() => archiveList(archiving)}
			/>

			<ConfirmDialog
				isOpen={isRepairingIds}
				onOpenChange={() => setRepairingIds(false)}
				className="ok-repair-ids-ask"
				variant="accent"
				confirmLabel={REPAIR}
				title={REPAIR_TITLE}
				description={remintCount === 1 ? REPAIR_ONE : REPAIR_MANY.replace("{count}", String(remintCount))}
				onConfirm={repairIds}
			/>

		</WidgetRoot>
	);
});
