import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import { registerPacks } from "@widgetarium/core/engine/packs.js";
import { PROJECT_PACK_ID, projectPackOf } from "@widgetarium/core/engine/project-pack.js";
import { openProject } from "@widgetarium/core/project/open-project.js";
import type { OpenedRoute } from "@widgetarium/core/project/open-project.js";
import type { ProjectFinding } from "@widgetarium/core/project/index.js";
import { vaultProjectFiles, type ProjectAdapter } from "./project-files-vault.js";

export type AppOpening =
	| {
			readonly ok: true;
			readonly routes: readonly OpenedRoute[];
			readonly registry: ModuleRegistry;
			readonly version: number;
	  }
	| { readonly ok: false; readonly findings: readonly ProjectFinding[]; readonly version: number };

export interface AppProjects {
	open(folder: string): Promise<AppOpening>;
	watch(folder: string, redraw: () => void): () => void;
	changed(path: string): void;
	close(): void;
}

interface HeldProjects {
	readonly adapter: ProjectAdapter;
	readonly openings: Map<string, Promise<AppOpening>>;
	readonly redraws: Map<string, Set<() => void>>;
	readonly timers: Map<string, number>;
	version: number;
}

interface AskedOpening {
	readonly folder: string;
	readonly version: number;
	isCurrent(): boolean;
}

const SETTLE_MS = 300;

export function createAppProjects(adapter: ProjectAdapter): AppProjects {
	const held: HeldProjects = { adapter, openings: new Map(), redraws: new Map(), timers: new Map(), version: 0 };
	return {
		open: (folder) => openingOf(held, folder),
		watch: (folder, redraw) => watchFolder(held, folder, redraw),
		changed: (path) => forgetFoldersHolding(held, path),
		close: () => closeAll(held),
	};
}

function forgetFoldersHolding(held: HeldProjects, path: string): void {
	const known = new Set([...held.openings.keys(), ...held.redraws.keys()]);
	for (const folder of known) if (path === folder || path.startsWith(`${folder}/`)) forgetAndRedraw(held, folder);
}

function closeAll(held: HeldProjects): void {
	for (const timer of held.timers.values()) window.clearTimeout(timer);
	held.timers.clear();
	held.openings.clear();
	held.redraws.clear();
}

function openingOf(held: HeldProjects, folder: string): Promise<AppOpening> {
	const standing = held.openings.get(folder);
	if (standing) return standing;
	held.version += 1;
	const opening: Promise<AppOpening> = openApp(held.adapter, {
		folder,
		version: held.version,
		isCurrent: () => held.openings.get(folder) === opening,
	});
	held.openings.set(folder, opening);
	return opening;
}

// TODO: scope handler ids per project; two open projects exporting one handler name share the first
async function openApp(adapter: ProjectAdapter, { folder, version, isCurrent }: AskedOpening): Promise<AppOpening> {
	const opening = await openProject(vaultProjectFiles(adapter, folder)).catch((failure: unknown) => ({
		ok: false as const,
		findings: [{ path: folder, message: failureMessage(failure) }],
	}));
	if (!opening.ok) return { ok: false, findings: opening.findings, version };
	if (isCurrent()) registerPacks({ ...projectPackOf(opening.project.handlers), id: `${PROJECT_PACK_ID}:${folder}` });
	return { ok: true, routes: opening.project.routes, registry: new ModuleRegistry(opening.project.widgets), version };
}

function watchFolder(held: HeldProjects, folder: string, redraw: () => void): () => void {
	const redraws = held.redraws.get(folder) ?? new Set<() => void>();
	redraws.add(redraw);
	held.redraws.set(folder, redraws);
	return () => {
		redraws.delete(redraw);
		if (redraws.size === 0) held.redraws.delete(folder);
	};
}

function forgetAndRedraw(held: HeldProjects, folder: string): void {
	held.openings.delete(folder);
	window.clearTimeout(held.timers.get(folder));
	held.timers.set(
		folder,
		window.setTimeout(() => {
			held.timers.delete(folder);
			for (const redraw of held.redraws.get(folder) ?? []) redraw();
		}, SETTLE_MS),
	);
}
