import { createWidget, WidgetRoot, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "widgetarium";
import { Button, Icon, List, Popover, PopoverItem, PopoverSeparator, Row, RowLabel, useSegmentedThumb } from "widgetarium/kit";
import { useState } from "react";

const STYLE = `
.orbi-board-tabs .obt-row { display: flex; align-items: center; gap: var(--size-4-2, 8px); flex-wrap: wrap; }

/* CONTEXT: styles.css squares .wg-kit-seg button and keeps the pill on ::before — so must the ring */
.orbi-board-tabs .obt-tab.is-editing { outline: none; cursor: text; }
/* CONTEXT: the second selector outranks the kit's focus ring, so the two never stack */
.orbi-board-tabs .obt-tab.is-editing::before,
.orbi-board-tabs .obt-tab.is-editing:focus-visible::before { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

.orbi-board-tabs .obt-more svg { width: 15px; height: 15px; }

/* CONTEXT: the dialog is portalled onto <body>, out of reach of the widget root's class */
.obt-archive .obt-archive-empty { margin: 0; font-size: var(--font-ui-small, 14px); color: var(--text-muted); }
/* CONTEXT: the label takes the slack, so only the button has to refuse to shrink */
.obt-archive .obt-restore { flex: none; }
`;

function toList(value) {
	if (Array.isArray(value)) return value;
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// CONTEXT: the first free number, so a board leaving does not hand out a name already in use
function freeUntitled(taken) {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

// CONTEXT: the strip is never empty — the last board out is replaced, any other hands over to a neighbour
function afterBoardLeaves(tabs, leaving, taken) {
	const left = tabs.filter((tab) => tab !== leaving);
	if (left.length > 0) return { tabs: left, selected: left[Math.min(tabs.indexOf(leaving), left.length - 1)] };
	const born = freeUntitled(taken);
	return { tabs: [born], selected: born };
}

// CONTEXT: a board with nothing in it still exists, so the list is data, not a read off the tasks
export default createWidget(function OrbiTaskBoardTabs({ settings, context, configure, data, actions, host }) {
	const tabs = toList(settings.tabs);
	const archived = toList(settings.archived);
	const selected = context?.get("board") ?? settings.activeTab ?? tabs[0];
	const [editing, setEditing] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [showingArchive, setShowingArchive] = useState(false);
	const { listRef, thumbProps } = useSegmentedThumb(selected, tabs);

	const addBoard = () => {
		const name = freeUntitled([...tabs, ...archived]);
		configure?.({ tabs: [...tabs, name].join(", "), activeTab: name });
		context?.set("board", name);
		setEditing(name);
	};

	// CONTEXT: the one place a board leaves the strip; the notes keep their `board`, so a restore is lossless
	const archive = (board) => {
		const next = afterBoardLeaves(tabs, board, [...tabs, ...archived]);
		configure?.({ tabs: next.tabs.join(", "), activeTab: next.selected, archived: [...archived, board].join(", ") });
		context?.set("board", next.selected);
	};

	const restore = (board) => {
		configure?.({ tabs: [...tabs, board].join(", "), archived: archived.filter((name) => name !== board).join(", ") });
	};

	// CONTEXT: the panel sits inside the anchor, so a press on an item never reaches the toggle
	const pick = (act) => () => {
		setMenuOpen(false);
		act();
	};

	// CONTEXT: a tab is only a name — the `board` property in a note is what files a task under it
	const rename = async (was, next) => {
		const name = String(next ?? "").trim();
		setEditing("");
		if (!name || name === was) return;
		if (tabs.includes(name)) {
			host?.ui?.notify(`"${name}" is already a board`);
			return;
		}

		configure?.({ tabs: tabs.map((tab) => (tab === was ? name : tab)).join(", "), activeTab: name });
		if (context?.get("board") === was) context.set("board", name);

		const held = (data?.tasks?.rows ?? []).filter((row) => row.props?.board === was);
		if (held.length === 0 || !actions?.tasks?.canUpdate) return;
		for (const row of held) await actions.tasks.update({ path: row.path }, { props: { board: name } });
	};

	const takeCaret = (node, tab) => {
		if (!node || editing !== tab) return;
		if (node.ownerDocument.activeElement === node) return;
		node.focus();
		// TRADE-OFF: the node's own window, because a bare getSelection() is not a global everywhere
		const selection = node.ownerDocument.defaultView?.getSelection?.();
		if (!selection) return;
		const range = node.ownerDocument.createRange();
		range.selectNodeContents(node);
		selection.removeAllRanges();
		selection.addRange(range);
	};

	const onTabKey = (event, tab) => {
		if (editing !== tab) return;
		if (event.key === "Enter") {
			event.preventDefault();
			rename(tab, event.currentTarget.textContent);
		}
		if (event.key === "Escape") {
			event.currentTarget.textContent = tab;
			setEditing("");
		}
	};

	const menuTrigger = (
		<button type="button" className="wg-kit-icon is-s obt-more" title="Board actions" aria-label="Board actions">
			<Icon name="menu" />
		</button>
	);

	return (
		<WidgetRoot defaultRounded="none" className="orbi orbi-board-tabs" defaultBackgroundType="none">
			<style>{STYLE}</style>
			<div className="obt-row">
				<div className="wg-kit-seg" ref={listRef} role="tablist">
					<span {...thumbProps} />
					{tabs.map((tab) => (
						<button
							type="button"
							key={tab}
							className={`obt-tab${editing === tab ? " is-editing" : ""}`}
							role="tab"
							aria-selected={String(tab === selected)}
							// CONTEXT: the name is edited where it is read, not in a dialog
							contentEditable={editing === tab ? "true" : undefined}
							suppressContentEditableWarning
							onClick={() => (editing === tab ? null : context?.set("board", tab))}
							onKeyDown={(event) => onTabKey(event, tab)}
							onBlur={(event) => (editing === tab ? rename(tab, event.currentTarget.textContent) : null)}
							ref={(node) => takeCaret(node, tab)}
						>
							{tab}
						</button>
					))}
				</div>
				<Popover trigger={menuTrigger} open={menuOpen} onOpenChange={setMenuOpen}>
					<PopoverItem onClick={pick(() => setEditing(selected))}>
						<Icon name="pencil" size={15} />
						Rename
					</PopoverItem>
					<PopoverItem onClick={pick(addBoard)}>
						<Icon name="plus" size={15} />
						Add board
					</PopoverItem>
					<PopoverItem onClick={pick(() => archive(selected))}>
						<Icon name="archive" size={15} />
						Archive
					</PopoverItem>
					<PopoverSeparator />
					<PopoverItem onClick={pick(() => setShowingArchive(true))}>
						<Icon name="folder" size={15} />
						Archived boards
					</PopoverItem>
				</Popover>
			</div>

			<Dialog open={showingArchive} onOpenChange={setShowingArchive}>
				<DialogContent className="obt-archive">
					<DialogClose />
					<DialogHeader>
						<DialogTitle>Archived boards</DialogTitle>
						<DialogDescription>To remove a board for good, delete its task files yourself.</DialogDescription>
					</DialogHeader>
					<div className="wg-dialog-body">
						{archived.length === 0 ? (
							<p className="obt-archive-empty">No boards are archived.</p>
						) : (
							<List>
								{archived.map((board) => (
									<Row key={board}>
										<RowLabel>{board}</RowLabel>
										<Button size="s" className="obt-restore" onClick={() => restore(board)}>
											Restore
										</Button>
									</Row>
								))}
							</List>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</WidgetRoot>
	);
});
