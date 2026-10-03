import { z } from "zod";
import { fingerprintNow, onlyUnderRoot, pathsChanged, readVault, withRootRead } from "./registry-reading.js";
import type {
	HeldWidget,
	OwnedSheet,
	PackageSource,
	RegistryAdapter,
	VaultRead,
	VaultWidgets,
} from "./registry-reading.js";
import type { WidgetRegistry } from "./registry.js";

export interface StartupSnapshot {
	readonly stamp: string;
	readonly buildsChecked: boolean;
	readonly read: VaultRead;
}

export interface StartupSnapshotStore {
	read(): Promise<unknown>;
	write(snapshot: StartupSnapshot): Promise<void>;
}

export interface WidgetsMounted {
	readonly from: "snapshot" | "vault";
	readonly widgets: number;
}

interface StartupCacheDoors {
	readonly registry: WidgetRegistry;
	readonly adapter: RegistryAdapter;
	readonly store: StartupSnapshotStore;
	readonly stamp: string;
	readonly systemRoot?: string | undefined;
}

const LOG = "[widgetarium] startup:";

const TextsSchema = z.array(z.string().nullable());

const HeldWidgetSchema: z.ZodType<HeldWidget> = z.object({
	record: z.string().nullable(),
	files: z.record(z.string(), z.string()).nullable(),
	build: z.string().nullable(),
	refusal: z.string().nullable(),
});

const OwnedSheetSchema: z.ZodType<OwnedSheet> = z.object({ owner: z.string(), path: z.string() });

const VaultWidgetsSchema: z.ZodType<VaultWidgets> = z
	.object({
		scopes: z.array(z.string()),
		sheets: z.array(OwnedSheetSchema),
		folders: z.array(z.string()),
		libPaths: TextsSchema,
		libSources: TextsSchema,
		sheetSources: TextsSchema,
		widgetSources: z.array(HeldWidgetSchema.nullable()),
		lockText: z.string().nullable(),
	})
	.refine(areReadsAligned, "the snapshot's parallel lists differ in length");

const PackageSourceSchema: z.ZodType<PackageSource> = z.object({
	key: z.string(),
	path: z.string(),
	source: z.string(),
});

const StartupSnapshotSchema: z.ZodType<StartupSnapshot> = z.object({
	stamp: z.string(),
	buildsChecked: z.boolean(),
	read: z.object({
		widgets: VaultWidgetsSchema,
		packages: z.array(PackageSourceSchema),
		fingerprint: z.record(z.string(), z.string()).nullable(),
	}),
});

export class StartupCache {
	private readonly doors: StartupCacheDoors;
	private current: StartupSnapshot | null = null;

	constructor(doors: StartupCacheDoors) {
		this.doors = doors;
		doors.registry.onLoaded = (read) => this.keep({ stamp: doors.stamp, buildsChecked: false, read });
	}

	async mount(): Promise<WidgetsMounted> {
		const { registry, store, stamp } = this.doors;
		const snapshot = await storedSnapshot(store);
		if (snapshot === null) return { from: "vault", widgets: (await registry.load()).size };
		if (snapshot.stamp !== stamp)
			console.info(`${LOG} snapshot from plugin ${snapshot.stamp}, running ${stamp} → mounted`);
		const read = await this.withSystemNow(snapshot.read);
		this.current = { ...snapshot, stamp, read };
		return { from: "snapshot", widgets: registry.mount(read).size };
	}

	private async withSystemNow(read: VaultRead): Promise<VaultRead> {
		const { adapter, systemRoot } = this.doors;
		if (systemRoot === undefined) return read;
		return withRootRead(read, await readVault(onlyUnderRoot(adapter, systemRoot), null, [systemRoot]), systemRoot);
	}

	async filesChanged(): Promise<readonly string[] | null> {
		const known = this.current?.read.fingerprint ?? null;
		if (known === null) return null;
		const now = await fingerprintNow(this.doors.adapter, known);
		return now === null ? null : pathsChanged(known, now);
	}

	areBuildsChecked(): boolean {
		return this.current?.buildsChecked === true;
	}

	markBuildsChecked(): void {
		if (this.current !== null && !this.current.buildsChecked) this.keep({ ...this.current, buildsChecked: true });
	}

	private keep(next: StartupSnapshot): void {
		this.current = next;
		if (next.read.fingerprint === null) {
			console.info(`${LOG} no snapshot kept — the vault adapter cannot stat a file`);
			return;
		}
		this.doors.store
			.write(next)
			.catch((failure: unknown) => console.error(`${LOG} the snapshot was not written`, failure));
	}
}

function areReadsAligned(widgets: VaultWidgets): boolean {
	return (
		widgets.libPaths.length === widgets.scopes.length &&
		widgets.libSources.length === widgets.scopes.length &&
		widgets.sheetSources.length === widgets.sheets.length &&
		widgets.widgetSources.length === widgets.folders.length
	);
}

async function storedSnapshot(store: StartupSnapshotStore): Promise<StartupSnapshot | null> {
	const raw = await store.read().catch((failure: unknown) => {
		console.error(`${LOG} the snapshot could not be read → reading the vault`, failure);
		return null;
	});
	if (raw === null || raw === undefined) {
		console.info(`${LOG} no snapshot → reading the vault`);
		return null;
	}
	const parsed = StartupSnapshotSchema.safeParse(raw);
	if (parsed.success) return parsed.data;
	console.warn(`${LOG} the snapshot does not parse → reading the vault`, parsed.error.issues.slice(0, 3));
	return null;
}
