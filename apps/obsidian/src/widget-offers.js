import { Platform, requestUrl } from "obsidian";
import { buildWidget } from "@widgetarium/core/registry.js";
import { scopeOf } from "@widgetarium/core/engine/widget-source.js";
import { libFileIn } from "@widgetarium/core/engine/widget-build.js";
import { createInstaller } from "@widgetarium/core/installer.js";

const CARD_NOT_COMPARED =
	"[widgetarium] the card of {widget} could not be compared with its code, so the install goes on without that check:";

export function pluginInstaller(plugin) {
	return createInstaller({
		adapter: plugin.app.vault.adapter,
		fetchJson: (url) => requestUrl({ url }).then((answer) => answer.json),
		fetchText: (url) => requestUrl({ url }).then((answer) => answer.text),
		disk: desktopDiskDoor(),
		readAdded: () => plugin.addedRegistries(),
		declaredIn: declaredManifestOf,
	});
}

export function drawable(entry) {
	if (!entry?.sources) return entry;
	try {
		return { ...entry, component: buildWidget(entry) };
	} catch (error) {
		return { ...entry, error };
	}
}

function declaredManifestOf(held) {
	const scope = scopeOf(held.record.id);
	const libName = libFileIn(Object.keys(held.scope ?? {}));
	try {
		const component = buildWidget({
			manifest: held.record,
			sources: held.files,
			path: held.record.id,
			lib: libName === null ? undefined : held.scope[libName],
			libPath: `${scope}/${libName}`,
			scope,
		});
		return component.manifest ?? null;
	} catch (failure) {
		console.warn(CARD_NOT_COMPARED.replace("{widget}", held.record.id), failure);
		return null;
	}
}

function desktopDiskDoor() {
	if (!Platform.isDesktopApp || typeof require !== "function") return null;
	const fs = require("node:fs/promises");
	const path = require("node:path");
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
