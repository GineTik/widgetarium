import { ROOT } from "./paths.js";
import { createModuleSpace } from "./engine/modules.js";
import type { ModuleAdapter, ModuleSpace } from "./engine/modules.js";
import { createBuilder } from "./engine/builder.js";
import type { Builder, BuilderAdapter } from "./engine/builder.js";
import { createWidgetSource } from "./engine/widget-source.js";
import type { SourceDisk, WidgetFiles, WidgetSource, WidgetSourcePlace } from "./engine/widget-source.js";
import type { Fields } from "./engine/catalogue-index.js";
import { sourcesOf } from "./sources.js";
import { SHIPPED_SOURCES } from "./registries.js";

export type InstallerAdapter = BuilderAdapter & ModuleAdapter;

export type HeldWidgetFiles = Extract<WidgetFiles, { readonly ok: true }>;

export type DeclaredIn = (held: HeldWidgetFiles) => Promise<Fields | null | undefined>;

export type Refusal = { readonly ok: false; readonly failure: string };

export interface InstallerOptions {
	readonly adapter: InstallerAdapter;
	readonly fetchJson: (url: string) => Promise<unknown>;
	readonly fetchText: (url: string) => Promise<string>;
	readonly disk?: SourceDisk | null;
	readonly readAdded?: () => Promise<unknown>;
	readonly shipped?: readonly WidgetSourcePlace[];
	readonly declaredIn?: DeclaredIn | null;
}

export interface ReadCatalogue {
	readonly raw: unknown;
	readonly sources: WidgetSourcePlace[];
}

export interface Installing {
	readonly adapter: InstallerAdapter;
	readonly declaredIn: DeclaredIn | null;
	readonly space: ModuleSpace;
	readonly widgets: WidgetSource;
	readonly builder: Builder;
	readJson(path: string, fallback: unknown): Promise<unknown>;
	writeJson(path: string, value: unknown): Promise<unknown>;
	readCatalogue(): Promise<ReadCatalogue>;
}

export const INDEX_PATH = `${ROOT}/catalogue.json`;

export function installerContext({
	adapter,
	fetchJson,
	fetchText,
	disk = null,
	readAdded = async () => [],
	shipped = SHIPPED_SOURCES,
	declaredIn = null,
}: InstallerOptions): Installing {
	const space = createModuleSpace({ adapter, fetchText });
	const readJson = (path: string, fallback: unknown): Promise<unknown> => readJsonAt(adapter, path, fallback);
	return {
		adapter,
		declaredIn,
		space,
		widgets: createWidgetSource({ fetchJson, fetchText, disk }),
		builder: createBuilder({ adapter, space }),
		readJson,
		writeJson: (path, value) => adapter.write(path, `${JSON.stringify(value, null, "\t")}\n`),
		readCatalogue: async () => {
			const legacy = await readJson(INDEX_PATH, null);
			return { raw: legacy, sources: sourcesOf({ added: await readAdded(), legacy, shipped }) };
		},
	};
}

export function refuse(failure: string): Refusal {
	return { ok: false, failure };
}

async function readJsonAt(adapter: InstallerAdapter, path: string, fallback: unknown): Promise<unknown> {
	if (!(await adapter.exists(path))) return fallback;
	try {
		return JSON.parse(await adapter.read(path));
	} catch (failure) {
		console.error(`[widgetarium] cannot read ${path}`, failure);
		return fallback;
	}
}
