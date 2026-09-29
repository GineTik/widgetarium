import { Platform } from "obsidian";
import { WIDGETS_DIR } from "@widgetarium/core/paths.js";

const SETTLE_MS = 300;
const WRITTEN_BY_THE_ENGINE = /(^|[\\/])build([\\/]|$)/;

export function watchWidgetScopes(adapter, onChange) {
	if (!Platform.isDesktopApp || typeof require !== "function" || typeof adapter.getBasePath !== "function") return null;
	const fs = require("node:fs");
	const path = require("node:path");
	const root = path.join(adapter.getBasePath(), WIDGETS_DIR);
	const stampOf = (file) => {
		try {
			const held = fs.statSync(file);
			return `${held.mtimeMs}:${held.size}`;
		} catch {
			return "gone";
		}
	};
	const stamps = new Map();
	let settleTimer = 0;
	let watchers = [];

	const settle = (folder, file) => {
		if (!file || WRITTEN_BY_THE_ENGINE.test(String(file))) return;
		const at = path.join(folder, String(file));
		const stamp = stampOf(at);
		if (stamps.get(at) === stamp) return;
		stamps.set(at, stamp);
		window.clearTimeout(settleTimer);
		settleTimer = window.setTimeout(onChange, SETTLE_MS);
	};
	const stampEveryFile = (folder) => {
		for (const file of fs.readdirSync(folder, { recursive: true }))
			stamps.set(path.join(folder, file), stampOf(path.join(folder, file)));
	};
	const watchFolder = (folder) => {
		try {
			const real = fs.realpathSync(folder);
			stampEveryFile(real);
			return [fs.watch(real, { recursive: true }, (_, file) => settle(real, file))];
		} catch (failure) {
			console.error(`[widgetarium] ${folder} cannot be watched, so an edit there shows only after a reload`, failure);
			return [];
		}
	};
	const closeAll = () => watchers.forEach((watcher) => watcher.close());
	const watchEveryScope = () => {
		closeAll();
		const scopes = fs
			.readdirSync(root, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() || entry.isSymbolicLink());
		for (const scope of scopes) stamps.set(path.join(root, scope.name), stampOf(path.join(root, scope.name)));
		watchers = scopes.flatMap((scope) => watchFolder(path.join(root, scope.name)));
	};

	watchEveryScope();
	if (watchers.length === 0) return null;
	const rootWatcher = watchRoot(
		fs,
		root,
		(file) => {
			const at = path.join(root, String(file));
			const before = stamps.get(at);
			settle(root, file);
			if (stamps.get(at) !== before) watchEveryScope();
		},
		closeAll,
	);
	return () => {
		window.clearTimeout(settleTimer);
		rootWatcher.close();
		closeAll();
	};
}

function watchRoot(fs, root, onEntry, closeScopes) {
	try {
		return fs.watch(root, (_, file) => {
			if (file) onEntry(file);
		});
	} catch (failure) {
		closeScopes();
		throw failure;
	}
}
