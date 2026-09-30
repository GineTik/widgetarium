import { isObject } from "@widgetarium/core/engine/is-object.js";
import { DEFAULT_PRESET, EDITABLE_FIELDS, PRESETS, presetById } from "./providers.js";
import type { EditableField, Provider } from "./providers.js";
import { READER_NAMES } from "./stream.js";
import type { Held } from "./stream.js";
import { sessionToKeep, turnsToKeep } from "./transcript.js";
import type { KeptTurn } from "./transcript.js";

export const AI_KEY = "ai";

export type ProviderFields = Partial<Record<EditableField, string>>;

export interface Transcript {
	readonly turns: KeptTurn[];
	readonly session: string | null;
}

export interface AiState {
	readonly chosen: string;
	readonly skipPermissions: boolean;
	readonly publishWidgets: boolean;
	readonly provider: Provider;
	readonly providers: Provider[];
}

export interface PluginDataStore {
	read(): Promise<unknown>;
	write(next: Held): Promise<unknown>;
}

export interface AiSettings {
	state(): Promise<AiState>;
	remembered(): Promise<Transcript>;
	remember(transcript: { readonly turns: unknown; readonly session: unknown }): Promise<void>;
	choose(id: string): Promise<AiState>;
	setSkipPermissions(on: unknown): Promise<AiState>;
	setPublishWidgets(on: unknown): Promise<AiState>;
	update(id: string, patch: unknown): Promise<AiState>;
	reset(id: string): Promise<AiState>;
}

export function transcriptIn(stored: unknown): Transcript {
	const held = objectIn(aiIn(stored)["transcript"]);
	return { turns: turnsToKeep(held["turns"]), session: sessionToKeep(held["session"]) };
}

export function providerFrom(stored: unknown, id: unknown): Provider | null {
	const preset = presetById(id);
	if (!preset) return null;
	return withOverrides(stored, preset);
}

export function aiStateOf(stored: unknown): AiState {
	const chosen = chosenPresetIn(stored);
	return {
		chosen: chosen.id,
		skipPermissions: skipsPermissionsIn(stored),
		publishWidgets: publishesWidgetsIn(stored),
		provider: withOverrides(stored, chosen),
		providers: PRESETS.map((preset) => withOverrides(stored, preset)),
	};
}

export function changedFrom(provider: Provider | null | undefined): EditableField[] {
	const preset = presetById(provider?.id);
	if (!provider || !preset) return [];
	return EDITABLE_FIELDS.filter((field) => provider[field] !== preset[field]);
}

export function createAiSettings({ read, write }: PluginDataStore): AiSettings {
	const stateNow = async (): Promise<AiState> => aiStateOf(await read());

	async function writeAi(patch: Held): Promise<AiState> {
		const stored = objectIn(await read());
		await write({ ...stored, [AI_KEY]: { ...aiIn(stored), ...patch } });
		return stateNow();
	}

	return {
		state: stateNow,

		remembered: async () => transcriptIn(await read()),

		async remember({ turns, session }) {
			await writeAi({ transcript: { turns: turnsToKeep(turns), session: sessionToKeep(session) } });
		},

		async choose(id) {
			if (!presetById(id)) return stateNow();
			return writeAi({ provider: id });
		},

		async setSkipPermissions(on) {
			return writeAi({ skipPermissions: on === true });
		},

		async setPublishWidgets(on) {
			return writeAi({ publishWidgets: on === true });
		},

		async update(id, patch) {
			if (!presetById(id)) return stateNow();
			const held = overridesOf(await read());
			return writeAi({ overrides: { ...held, [id]: { ...objectIn(held[id]), ...keepEditableFields(patch) } } });
		},

		async reset(id) {
			const { [id]: dropped, ...rest } = overridesOf(await read());
			return writeAi({ overrides: rest });
		},
	};
}

function objectIn(held: unknown): Held {
	return isObject(held) ? held : {};
}

function aiIn(stored: unknown): Held {
	return objectIn(objectIn(stored)[AI_KEY]);
}

function overridesOf(stored: unknown): Held {
	return objectIn(aiIn(stored)["overrides"]);
}

function withOverrides(stored: unknown, preset: Provider): Provider {
	return { ...preset, ...keepEditableFields(overridesOf(stored)[preset.id]) };
}

function chosenPresetIn(stored: unknown): Provider {
	return presetById(aiIn(stored)["provider"]) ?? DEFAULT_PRESET;
}

function skipsPermissionsIn(stored: unknown): boolean {
	return aiIn(stored)["skipPermissions"] !== false;
}

function publishesWidgetsIn(stored: unknown): boolean {
	return aiIn(stored)["publishWidgets"] !== false;
}

function isUsable(field: EditableField, value: unknown): value is string {
	return typeof value === "string" && (field !== "outputFormat" || READER_NAMES.includes(value));
}

function keepEditableFields(patch: unknown): ProviderFields {
	const given = objectIn(patch);
	const held: ProviderFields = {};
	for (const field of EDITABLE_FIELDS) {
		const value = given[field];
		if (isUsable(field, value)) held[field] = value;
	}
	return held;
}
