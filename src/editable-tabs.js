import { createElement as h, useState } from "react";
import { Button, Icon, List, Popover, PopoverItem, PopoverSeparator, Row, RowLabel, useSegmentedThumb } from "./kit.js";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./dialog.js";

// CONTEXT: authored whole, filled by replace — a built sentence cannot be reordered
const NAME_TAKEN = 'A tab named "{name}" is already here.';
const DELETE_TITLE = 'Delete "{name}"?';
const DELETE = "Delete";
const DEFAULT_DELETE_WARNING = "The tab goes for good, with everything it holds. This cannot be undone.";

const STYLE = `
.wg-tabs { display: flex; align-items: center; gap: var(--size-4-2, 8px); flex-wrap: wrap; }

/* CONTEXT: styles.css squares .wg-kit-seg button and keeps the pill on ::before — so must the ring */
.wg-tabs-tab.is-editing { outline: none; cursor: text; }
/* CONTEXT: the second selector outranks the kit's focus ring, so the two never stack */
.wg-tabs-tab.is-editing::before,
.wg-tabs-tab.is-editing:focus-visible::before { box-shadow: inset 0 0 0 2px var(--interactive-accent); }

.wg-tabs-more svg { width: 15px; height: 15px; }

/* CONTEXT: the dialog is portalled onto <body>, out of reach of the strip's own class */
.wg-tabs-archive .wg-tabs-empty { margin: 0; font-size: var(--font-ui-small, 14px); color: var(--text-muted); }
/* CONTEXT: the label takes the slack, so only the buttons refuse to shrink */
.wg-tabs-archive .wg-tabs-act { flex: none; }
`;

// CONTEXT: one splitter, because a tab name and a board's column name are the same kind of list
export { toTabList } from "./board-record.js";

// CONTEXT: the first free number, so a tab leaving does not hand out a name already in use
function freeUntitled(taken) {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

// CONTEXT: the strip is never empty — the last tab out is replaced, any other hands over to a neighbour
function afterTabLeaves(tabs, leaving, taken) {
	const left = tabs.filter((tab) => tab !== leaving);
	if (left.length > 0) return { tabs: left, selected: left[Math.min(tabs.indexOf(leaving), left.length - 1)] };
	const born = freeUntitled(taken);
	return { tabs: [born], selected: born };
}

function fill(sentence, name) {
	return sentence.replace("{name}", name);
}

// CONTEXT: a strip of names only — what a name MEANS is the caller's, handed in and folded back out
// CONTEXT: one step per action, carrying the whole strip after it; archiving destroys nothing
export function EditableTabs({ tabs, archived, selected, onChange, onRefuse, deleteWarning, className }) {
	const [editing, setEditing] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [showingArchive, setShowingArchive] = useState(false);
	const [deleting, setDeleting] = useState("");
	const { listRef, thumbProps } = useSegmentedThumb(selected, tabs);

	const step = (verb, patch) => onChange?.({ verb, tabs, archived, selected, name: selected, was: null, ...patch });

	const add = () => {
		const name = freeUntitled([...tabs, ...archived]);
		step("add", { tabs: [...tabs, name], selected: name, name });
		setEditing(name);
	};

	const archive = (tab) => {
		const next = afterTabLeaves(tabs, tab, [...tabs, ...archived]);
		step("archive", { tabs: next.tabs, selected: next.selected, archived: [...archived, tab], name: tab });
	};

	const restore = (tab) => step("restore", { tabs: [...tabs, tab], archived: archived.filter((name) => name !== tab), name: tab });

	const remove = (tab) => {
		setDeleting("");
		step("delete", { archived: archived.filter((name) => name !== tab), name: tab });
	};

	// CONTEXT: the panel sits inside the anchor, so a press on an item never reaches the toggle
	const pick = (act) => () => {
		setMenuOpen(false);
		act();
	};

	const rename = (was, next) => {
		const name = String(next ?? "").trim();
		setEditing("");
		if (!name || name === was) return;
		if (tabs.includes(name) || archived.includes(name)) {
			onRefuse?.(fill(NAME_TAKEN, name));
			return;
		}
		step("rename", { tabs: tabs.map((tab) => (tab === was ? name : tab)), selected: name, name, was });
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

	const tabButton = (tab) =>
		h(
			"button",
			{
				type: "button",
				key: tab,
				className: `wg-tabs-tab${editing === tab ? " is-editing" : ""}`,
				role: "tab",
				"aria-selected": String(tab === selected),
				// CONTEXT: the name is edited where it is read, not in a dialog
				contentEditable: editing === tab ? "true" : undefined,
				suppressContentEditableWarning: true,
				onClick: () => (editing === tab ? null : step("select", { selected: tab, name: tab })),
				onKeyDown: (event) => onTabKey(event, tab),
				onBlur: (event) => (editing === tab ? rename(tab, event.currentTarget.textContent) : null),
				ref: (node) => takeCaret(node, tab),
			},
			tab,
		);

	const menuTrigger = h(
		"button",
		{ type: "button", className: "wg-kit-icon is-s wg-tabs-more", title: "Tab actions", "aria-label": "Tab actions" },
		h(Icon, { name: "menu" }),
	);

	const menu = h(Popover, { key: "menu", trigger: menuTrigger, open: menuOpen, onOpenChange: setMenuOpen }, [
		h(PopoverItem, { key: "rename", onClick: pick(() => setEditing(selected)) }, [h(Icon, { key: "i", name: "pencil", size: 15 }), "Rename"]),
		h(PopoverItem, { key: "add", onClick: pick(add) }, [h(Icon, { key: "i", name: "plus", size: 15 }), "Add"]),
		h(PopoverItem, { key: "archive", onClick: pick(() => archive(selected)) }, [h(Icon, { key: "i", name: "archive", size: 15 }), "Archive"]),
		h(PopoverSeparator, { key: "sep" }),
		h(PopoverItem, { key: "list", onClick: pick(() => setShowingArchive(true)) }, [h(Icon, { key: "i", name: "folder", size: 15 }), "Archived list"]),
	]);

	const archivedRow = (tab) =>
		h(Row, { key: tab }, [
			h(RowLabel, { key: "name" }, tab),
			h(Button, { key: "restore", size: "s", className: "wg-tabs-act wg-tabs-restore", onClick: () => restore(tab) }, "Restore"),
			h(Button, { key: "delete", size: "s", variant: "danger", className: "wg-tabs-act wg-tabs-delete", onClick: () => setDeleting(tab) }, "Delete"),
		]);

	const archiveDialog = h(
		Dialog,
		{ key: "archive", open: showingArchive, onOpenChange: setShowingArchive },
		h(DialogContent, { className: "wg-tabs-archive" }, [
			h(DialogClose, { key: "close" }),
			h(DialogHeader, { key: "head" }, [
				h(DialogTitle, { key: "title" }, "Archived list"),
				h(DialogDescription, { key: "desc" }, "Restore brings a tab back exactly as it was. Delete removes it for good."),
			]),
			h(
				"div",
				{ key: "body", className: "wg-dialog-body" },
				archived.length === 0 ? h("p", { className: "wg-tabs-empty" }, "Nothing is archived.") : h(List, null, archived.map(archivedRow)),
			),
		]),
	);

	const confirmDialog = h(ConfirmDialog, {
		key: "confirm",
		open: Boolean(deleting),
		onOpenChange: () => setDeleting(""),
		className: "wg-tabs-confirm",
		title: fill(DELETE_TITLE, deleting),
		description: deleteWarning ?? DEFAULT_DELETE_WARNING,
		confirmLabel: DELETE,
		onConfirm: () => remove(deleting),
	});

	return h("div", { className: className ? `wg-tabs ${className}` : "wg-tabs" }, [
		h("style", { key: "style" }, STYLE),
		h("div", { key: "strip", className: "wg-kit-seg", ref: listRef, role: "tablist" }, [h("span", { key: "thumb", ...thumbProps }), ...tabs.map(tabButton)]),
		menu,
		archiveDialog,
		confirmDialog,
	]);
}
