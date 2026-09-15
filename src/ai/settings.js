import { DEFAULT_PROVIDER, EDITABLE_FIELDS, PRESETS, presetById } from "./providers.js";
import { READER_NAMES } from "./stream.js";
import { keptSession, keptTurns } from "./transcript.js";

export const AI_KEY = "ai";

function overridesOf(stored) {
	const held = stored?.[AI_KEY]?.overrides;
	return held !== null && typeof held === "object" ? held : {};
}

function chosenIn(stored) {
	const asked = stored?.[AI_KEY]?.provider;
	return presetById(asked) ? asked : DEFAULT_PROVIDER;
}

function skipsPermissionsIn(stored) {
	return stored?.[AI_KEY]?.skipPermissions !== false;
}

function publishesWidgetsIn(stored) {
	return stored?.[AI_KEY]?.publishWidgets !== false;
}

const isUsable = (field, value) =>
	typeof value === "string" && (field !== "outputFormat" || READER_NAMES.includes(value));

function keptFields(patch) {
	const held = {};
	for (const field of EDITABLE_FIELDS) {
		if (isUsable(field, patch?.[field])) held[field] = patch[field];
	}
	return held;
}

export function transcriptIn(stored) {
	const held = stored?.[AI_KEY]?.transcript;
	return { turns: keptTurns(held?.turns), session: keptSession(held?.session) };
}

export function providerFrom(stored, id) {
	const preset = presetById(id);
	if (!preset) return null;
	return { ...preset, ...keptFields(overridesOf(stored)[id]) };
}

export function aiStateOf(stored) {
	const chosen = chosenIn(stored);
	return {
		chosen,
		skipPermissions: skipsPermissionsIn(stored),
		publishWidgets: publishesWidgetsIn(stored),
		provider: providerFrom(stored, chosen),
		providers: PRESETS.map((preset) => providerFrom(stored, preset.id)),
	};
}

export function changedFrom(provider) {
	const preset = presetById(provider?.id);
	if (!preset) return [];
	return EDITABLE_FIELDS.filter((field) => provider[field] !== preset[field]);
}

export function createAiSettings({ read, write }) {
	const stateNow = async () => aiStateOf(await read());

	async function writeAi(patch) {
		const stored = (await read()) ?? {};
		await write({ ...stored, [AI_KEY]: { ...(stored[AI_KEY] ?? {}), ...patch } });
		return stateNow();
	}

	return {
		state: stateNow,

		remembered: async () => transcriptIn(await read()),

		async remember({ turns, session }) {
			await writeAi({ transcript: { turns: keptTurns(turns), session: keptSession(session) } });
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
			const stored = (await read()) ?? {};
			const held = overridesOf(stored);
			return writeAi({ overrides: { ...held, [id]: { ...(held[id] ?? {}), ...keptFields(patch) } } });
		},

		async reset(id) {
			const stored = (await read()) ?? {};
			const { [id]: dropped, ...rest } = overridesOf(stored);
			return writeAi({ overrides: rest });
		},
	};
}
