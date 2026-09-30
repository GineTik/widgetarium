import { Platform } from "obsidian";
import type { DataAdapter } from "obsidian";
import type { FSWatcher } from "node:fs";
import { WIDGETS_DIR } from "@widgetarium/core/paths.js";
import { reportsBasePath } from "./desktop-adapter.js";

type NodeFs = typeof import("node:fs");
type NodePath = typeof import("node:path");

interface ScopeWatch {
	readonly fs: NodeFs;
	readonly path: NodePath;
	readonly root: string;
	readonly stamps: Map<string, string>;
	readonly onChange: () => void;
	settleTimer: number;
	watchers: FSWatcher[];
}

const SETTLE_MS = 300;
const WRITTEN_BY_THE_ENGINE = /(^|[\\/])build([\\/]|$)/;

export function watchWidgetScopes(adapter: DataAdapter, onChange: () => void): (() => void) | null {
	if (!Platform.isDesktopApp || typeof require !== "function" || !reportsBasePath(adapter)) return null;
	const fs: NodeFs = require("node:fs");
	const path: NodePath = require("node:path");
	const watch: ScopeWatch = {
		fs,
		path,
		root: path.join(adapter.getBasePath(), WIDGETS_DIR),
		stamps: new Map(),
		onChange,
		settleTimer: 0,
		watchers: [],
	};

	watchEveryScope(watch);
	if (watch.watchers.length === 0) return null;
	const rootWatcher = watchRoot(
		fs,
		watch.root,
		(file) => {
			const at = path.join(watch.root, String(file));
			const before = watch.stamps.get(at);
			settle(watch, watch.root, file);
			if (watch.stamps.get(at) !== before) watchEveryScope(watch);
		},
		() => closeAll(watch),
	);
	return () => {
		window.clearTimeout(watch.settleTimer);
		rootWatcher.close();
		closeAll(watch);
	};
}

function stampOf(fs: NodeFs, file: string): string {
	try {
		const held = fs.statSync(file);
		return `${held.mtimeMs}:${held.size}`;
	} catch {
		return "gone";
	}
}

function settle(watch: ScopeWatch, folder: string, file: string | null): void {
	if (!file || WRITTEN_BY_THE_ENGINE.test(String(file))) return;
	const at = watch.path.join(folder, String(file));
	const stamp = stampOf(watch.fs, at);
	if (watch.stamps.get(at) === stamp) return;
	watch.stamps.set(at, stamp);
	window.clearTimeout(watch.settleTimer);
	watch.settleTimer = window.setTimeout(watch.onChange, SETTLE_MS);
}

function stampEveryFile(watch: ScopeWatch, folder: string): void {
	for (const file of watch.fs.readdirSync(folder, { recursive: true, encoding: "utf8" }))
		watch.stamps.set(watch.path.join(folder, file), stampOf(watch.fs, watch.path.join(folder, file)));
}

function watchFolder(watch: ScopeWatch, folder: string): FSWatcher[] {
	try {
		const real = watch.fs.realpathSync(folder);
		stampEveryFile(watch, real);
		return [watch.fs.watch(real, { recursive: true }, (_, file) => settle(watch, real, file))];
	} catch (failure) {
		console.error(`[widgetarium] ${folder} cannot be watched, so an edit there shows only after a reload`, failure);
		return [];
	}
}

function closeAll(watch: ScopeWatch): void {
	watch.watchers.forEach((watcher) => watcher.close());
}

function watchEveryScope(watch: ScopeWatch): void {
	closeAll(watch);
	const { fs, path, root, stamps } = watch;
	const scopes = fs
		.readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() || entry.isSymbolicLink());
	for (const scope of scopes) stamps.set(path.join(root, scope.name), stampOf(fs, path.join(root, scope.name)));
	watch.watchers = scopes.flatMap((scope) => watchFolder(watch, path.join(root, scope.name)));
}

function watchRoot(fs: NodeFs, root: string, onEntry: (file: string) => void, closeScopes: () => void): FSWatcher {
	try {
		return fs.watch(root, (_, file) => {
			if (file) onEntry(file);
		});
	} catch (failure) {
		closeScopes();
		throw failure;
	}
}
