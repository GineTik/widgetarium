import type { MutableRefObject, RefObject } from "react";
import { sidebarWidth, widenBox, withWidth } from "../tree.js";
import type { BoxNode } from "../tree-nodes.js";
import type { CommitLayout } from "./board-edits.js";
import type { PointerAt } from "./carry.js";

export interface SidebarDrag {
	readonly stop: () => void;
	readonly repaint: () => void;
}

interface SidebarLayout {
	readonly width: number;
	readonly commitLayout: CommitLayout;
}

interface SidebarRefs {
	readonly sidebarRef: MutableRefObject<SidebarDrag | null>;
	readonly pageRef: RefObject<HTMLElement | null>;
}

type GripEvent = PointerAt & Pick<PointerEvent, "preventDefault" | "stopPropagation">;

export type Toward = 1 | -1;

export type GrabSidebar = (at: number, toward: Toward) => (event: GripEvent) => void;

interface DragRecipe {
	readonly read: (pointer: PointerAt, give: boolean) => number;
	readonly paint: (given: number) => void;
	readonly commit: (given: number) => void;
}

interface SidebarAsk {
	readonly root: BoxNode;
	readonly at: number;
	readonly toward: Toward;
	readonly event: PointerAt;
	readonly width: number;
	readonly pageRef: RefObject<HTMLElement | null>;
}

export function sidebarGrip(
	{ width, commitLayout }: SidebarLayout,
	{ sidebarRef, pageRef }: SidebarRefs,
	root: BoxNode,
): GrabSidebar {
	return (at, toward) => (event) => {
		event.preventDefault();
		event.stopPropagation();
		dragUntilDropped(sidebarRef, event, {
			...sidebarRecipe({ root, at, toward, event, width, pageRef }),
			commit: (given) => commitLayout((held) => withWidth(held, [at], given)),
		});
	};
}

function dragUntilDropped(
	dragRef: MutableRefObject<SidebarDrag | null>,
	event: GripEvent,
	{ read, paint, commit }: DragRecipe,
): void {
	event.preventDefault();
	event.stopPropagation();
	let latest: number | null = null;
	let shown: number | null = null;
	const draw = (): void => {
		if (shown !== null) paint(shown);
	};
	const move = (moved: PointerEvent): void => {
		latest = read(moved, false);
		shown = read(moved, true);
		draw();
	};
	const stop = (): void => {
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", stop);
		document.body.classList.remove("wg-tree-dragging");
		dragRef.current = null;
		if (latest === null) return;
		shown = latest;
		draw();
		commit(latest);
	};
	dragRef.current = { stop, repaint: draw };
	document.body.classList.add("wg-tree-dragging");
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", stop);
}

function sidebarRecipe({ root, at, toward, event, width, pageRef }: SidebarAsk): Omit<DragRecipe, "commit"> {
	const held = sidebarWidth(root, at);
	const grabbed = event.clientX;
	const node = pageRef.current?.querySelector<HTMLElement>(`.wg-tree-region[data-region="${at}"]`);
	const wantedAt = (pointer: PointerAt): number => held + (pointer.clientX - grabbed) * toward;
	return {
		read: (pointer, give) => widenBox(root, at, { wantedPx: wantedAt(pointer), width, give }),
		paint: (given) => {
			if (node) node.style.flexBasis = `${given}px`;
		},
	};
}
