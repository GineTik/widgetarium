import { MarkdownRenderChild } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { measure, trace } from "@widgetarium/core/trace.js";
import { bindNote } from "./host.js";
import { hasPendingWrite } from "./board-writes.js";

export function mountBoardByBlock(plugin, element, board, save, screen, context, blockKey) {
	shieldFromEditor(element);

	const key = blockKey ?? element;
	renamePositionalMount(plugin.mounts, key, `${context.sourcePath}#0`);
	const existing = plugin.mounts.get(key);
	if (existing) return remounted(plugin, existing, { element, board, save, screen, context, blockKey, key });

	const mount = freshMount(plugin, { element, board, save, screen, context });
	plugin.mounts.set(key, mount);
	mount.draw();
	watchElementUnload(plugin, mount, key, context);
	return mount;
}

function renamePositionalMount(mounts, key, positionalKey) {
	if (mounts.has(key) || key === positionalKey || !mounts.has(positionalKey)) return;
	mounts.set(key, mounts.get(positionalKey));
	mounts.delete(positionalKey);
}

function remounted(plugin, existing, { element, board, save, screen, context, blockKey, key }) {
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

function moveOwnNodeInto(existing, element) {
	element.appendChild(existing.node);
	existing.element = element;
}

function freshMount(plugin, { element, board, save, screen, context }) {
	const node = element.ownerDocument.createElement("div");
	node.className = "wg-mount interactive-child";
	element.appendChild(node);

	const hostBoundOncePerMount = bindNote(plugin.host, context.sourcePath);
	const mount = { element, node, state: { board }, save, screen, width: 0, host: hostBoundOncePerMount };
	mount.draw = () => {
		measure("surface draw", () => render(surfaceOf(plugin, mount), mount.node));
	};
	mount.commit = (next) => {
		mount.state.board = next;
		mount.draw();
		mount.save(next);
	};
	return mount;
}

function surfaceOf(plugin, mount) {
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

function watchElementUnload(plugin, mount, key, context) {
	if (mount.watched === mount.element) return;
	mount.watched = mount.element;
	const child = new MarkdownRenderChild(mount.element);
	child.onunload = () => {
		window.setTimeout(() => dropMountIfNotRedrawn(plugin, key), 0);
	};
	context.addChild(child);
}

function dropMountIfNotRedrawn(plugin, key) {
	const current = plugin.mounts.get(key);
	if (!current || current.node.isConnected) return;
	plugin.mounts.delete(key);
	render(null, current.node);
	plugin.header.sync();
}
