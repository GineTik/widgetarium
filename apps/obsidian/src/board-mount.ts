import { MarkdownRenderChild } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { measure, trace } from "@widgetarium/core/trace.js";
import type { Board } from "@widgetarium/core/model.js";
import type { BoardRegistry } from "@widgetarium/core/surface/use-surface-shared.js";
import { bindNote } from "./host.js";
import type { ObsidianHost } from "./host.js";
import { hasPendingWrite } from "./board-writes.js";
import type { PendingWrites } from "./board-writes.js";
import type { HeaderActions, HeaderMount } from "./header-actions.js";

export type SaveBoard = (next: Board) => void;

export type MountContext = Pick<MarkdownPostProcessorContext, "sourcePath" | "addChild">;

export interface BoardMount extends HeaderMount {
	element: HTMLElement;
	readonly node: HTMLElement;
	readonly state: { board: Board };
	save: SaveBoard;
	screen: boolean;
	width: number;
	readonly host: ObsidianHost;
	blockIndex?: number;
	drafting?: boolean;
	watched?: HTMLElement;
	draw(): void;
	commit(next: Board): void;
}

export interface MountingPlugin extends PendingWrites {
	readonly mounts: Map<unknown, BoardMount>;
	readonly host: ObsidianHost;
	readonly registry: BoardRegistry;
	readonly editing: boolean;
	readonly header: HeaderActions;
}

export interface MountAsk {
	readonly element: HTMLElement;
	readonly board: Board;
	readonly save: SaveBoard;
	readonly screen: boolean;
	readonly context: MountContext;
	readonly blockKey: string | null | undefined;
}

export function mountBoardByBlock(plugin: MountingPlugin, ask: MountAsk): BoardMount {
	const { element, context, blockKey } = ask;
	shieldFromEditor(element);

	const key = blockKey ?? element;
	renamePositionalMount(plugin.mounts, key, `${context.sourcePath}#0`);
	const existing = plugin.mounts.get(key);
	if (existing) return remount(plugin, existing, ask, key);

	const mount = freshMount(plugin, ask);
	plugin.mounts.set(key, mount);
	mount.draw();
	watchElementUnload(plugin, mount, key, context);
	return mount;
}

function renamePositionalMount(mounts: Map<unknown, BoardMount>, key: unknown, positionalKey: string): void {
	const positional = mounts.get(positionalKey);
	if (mounts.has(key) || key === positionalKey || !positional) return;
	mounts.set(key, positional);
	mounts.delete(positionalKey);
}

function remount(plugin: MountingPlugin, existing: BoardMount, ask: MountAsk, key: unknown): BoardMount {
	const { element, board, save, screen, context, blockKey } = ask;
	trace("re-mount", {
		key: String(key),
		blockKey,
		sameElement: existing.element === element,
		pendingWrite: hasPendingWrite(plugin, blockKey),
		keptWidth: existing.width,
	});
	if (!hasPendingWrite(plugin, blockKey)) existing.state.board = board;
	if (existing.element !== element) moveOwnNodeInto(existing, element);
	existing.save = save;
	existing.screen = screen;
	existing.draw();
	watchElementUnload(plugin, existing, key, context);
	return existing;
}

function moveOwnNodeInto(existing: BoardMount, element: HTMLElement): void {
	element.appendChild(existing.node);
	existing.element = element;
}

function freshMount(plugin: MountingPlugin, { element, board, save, screen, context }: MountAsk): BoardMount {
	const node = element.ownerDocument.createElement("div");
	node.className = "wg-mount interactive-child";
	element.appendChild(node);

	const hostBoundOncePerMount = bindNote(plugin.host, context.sourcePath);
	const mount: BoardMount = {
		element,
		node,
		state: { board },
		save,
		screen,
		width: 0,
		host: hostBoundOncePerMount,
		draw: () => {
			measure("surface draw", () => render(surfaceOf(plugin, mount), mount.node));
		},
		commit: (next) => {
			mount.state.board = next;
			mount.draw();
			mount.save(next);
		},
	};
	return mount;
}

function surfaceOf(plugin: MountingPlugin, mount: BoardMount): ReactElement {
	return h(WidgetSurface, {
		board: mount.state.board,
		boardNode: mount.node,
		registry: plugin.registry,
		host: mount.host,
		editing: plugin.editing,
		onActions: (actions) => plugin.header.hold(mount, actions),
		screen: mount.screen,
		initialWidth: mount.width,
		onWidth: (value) => {
			mount.width = value;
		},
		onChange: (next) => mount.commit(next),
		onDrafting: (drafting) => {
			mount.drafting = drafting;
		},
	});
}

function watchElementUnload(plugin: MountingPlugin, mount: BoardMount, key: unknown, context: MountContext): void {
	if (mount.watched === mount.element) return;
	mount.watched = mount.element;
	const child = new MarkdownRenderChild(mount.element);
	child.onunload = () => {
		window.setTimeout(() => dropMountIfNotRedrawn(plugin, key), 0);
	};
	context.addChild(child);
}

function dropMountIfNotRedrawn(plugin: MountingPlugin, key: unknown): void {
	const current = plugin.mounts.get(key);
	if (!current || current.node.isConnected) return;
	plugin.mounts.delete(key);
	render(null, current.node);
	plugin.header.sync();
}
