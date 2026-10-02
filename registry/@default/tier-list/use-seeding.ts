import { DEFAULT_TIERS } from "./tiers";
import { rowsOf } from "./cards";
import type { Preset } from "./presets";
import type { Gates } from "./types";

const NO_PRESETS_HERE = "A preset may only fill a list typed into this tile, never a folder in the vault.";

export function useSeeding({ replaceCards, replaceTiers, say }: Gates) {
	return {
		preset: async (preset: Preset) => {
			if (!replaceTiers.can().can || !replaceCards.can().can) return say(NO_PRESETS_HERE);
			await replaceTiers(rowsOf(DEFAULT_TIERS));
			await replaceCards(rowsOf(preset.cards));
		},
	};
}
