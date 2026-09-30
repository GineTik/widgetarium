import { Platform, requestUrl } from "obsidian";
import type { DataAdapter } from "obsidian";
import { buildWidget } from "@widgetarium/core/registry.js";
import type { WidgetComponent } from "@widgetarium/core/registry-scope.js";
import { scopeOf } from "@widgetarium/core/engine/widget-source.js";
import type { SourceDisk } from "@widgetarium/core/engine/source-disk.js";
import { libFileIn } from "@widgetarium/core/engine/widget-build.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { Fields } from "@widgetarium/core/engine/catalogue-index.js";
import { createInstaller } from "@widgetarium/core/installer.js";
import type { HeldWidgetFiles, InstallerAdapter } from "@widgetarium/core/installer-context.js";
import type { VersionedManifest } from "@widgetarium/core/version.js";

export type Installer = ReturnType<typeof createInstaller>;

export interface InstallingPlugin {
	readonly app: { readonly vault: { readonly adapter: DataAdapter & InstallerAdapter } };
	addedRegistries(): Promise<unknown>;
}

export interface DrawableEntry {
	readonly manifest?: unknown;
	readonly sources?: Readonly<Record<string, string>> | undefined;
	readonly path?: string | undefined;
	readonly lib?: string | undefined;
	readonly libPath?: string | undefined;
	readonly scope?: string | undefined;
}

export type Drawn<Entry> =
	Entry | (Entry & { readonly component: WidgetComponent }) | (Entry & { readonly error: unknown });

const CARD_NOT_COMPARED =
	"[widgetarium] the card of {widget} could not be compared with its code, so the install goes on without that check:";

export function pluginInstaller(plugin: InstallingPlugin): Installer {
	return createInstaller({
		adapter: plugin.app.vault.adapter,
		fetchJson: (url) => requestUrl({ url }).then((answer): unknown => answer.json),
		fetchText: (url) => requestUrl({ url }).then((answer) => answer.text),
		disk: desktopDiskDoor(),
		readAdded: () => plugin.addedRegistries(),
		declaredIn: declaredManifestOf,
	});
}

export function drawable<Entry extends DrawableEntry>(entry: Entry): Drawn<Entry> {
	if (!entry?.sources) return entry;
	try {
		return { ...entry, component: buildWidget(buildInputOf(entry, entry.sources)) };
	} catch (error) {
		return { ...entry, error };
	}
}

function buildInputOf(
	entry: DrawableEntry,
	sources: Readonly<Record<string, string>>,
): Parameters<typeof buildWidget>[0] {
	return {
		manifest: versionedOf(entry.manifest),
		sources,
		path: entry.path ?? "",
		lib: entry.lib ?? null,
		scope: entry.scope ?? null,
		...(entry.libPath === undefined ? {} : { libPath: entry.libPath }),
	};
}

function versionedOf(manifest: unknown): VersionedManifest | null {
	if (!isObject(manifest)) return null;
	const { id, api } = manifest;
	return typeof id === "string" ? { id, api } : { api };
}

async function declaredManifestOf(held: HeldWidgetFiles): Promise<Fields | null> {
	const scope = scopeOf(held.record.id);
	const libName = libFileIn(Object.keys(held.scope ?? {}));
	try {
		const component = buildWidget({
			manifest: held.record,
			sources: held.files,
			path: held.record.id,
			lib: libName === null ? null : (held.scope[libName] ?? null),
			libPath: `${scope}/${libName}`,
			scope,
		});
		return isObject(component.manifest) ? component.manifest : null;
	} catch (failure) {
		console.warn(CARD_NOT_COMPARED.replace("{widget}", held.record.id), failure);
		return null;
	}
}

function desktopDiskDoor(): SourceDisk | null {
	if (!Platform.isDesktopApp || typeof require !== "function") return null;
	const fs: typeof import("node:fs/promises") = require("node:fs/promises");
	const path: typeof import("node:path") = require("node:path");
	return {
		exists: (at) =>
			fs.access(at).then(
				() => true,
				() => false,
			),
		read: (at) => fs.readFile(at, "utf8"),
		folders: async (at) => {
			const held = await fs.readdir(at, { withFileTypes: true });
			return held.filter((entry) => entry.isDirectory()).map((entry) => path.join(at, entry.name));
		},
		files: async (at) => {
			const held = await fs.readdir(at, { withFileTypes: true });
			return held.filter((entry) => entry.isFile()).map((entry) => path.join(at, entry.name));
		},
	};
}
