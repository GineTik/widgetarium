import { canDo } from "widgetarium";
import { DEFAULT_TIERS } from "./tiers";
import { rowsOf } from "./cards";
import type { Preset } from "./presets";
import type { Gates } from "./types";

const NO_PRESETS_HERE = "A preset may only fill a list typed into this tile, never a folder in the vault.";

export function useSeeding({ cards, tiers, say }: Gates) {
	return {
		preset: async (preset: Preset) => {
			if (!canDo(tiers.replace) || !canDo(cards.replace)) return say(NO_PRESETS_HERE);
			await tiers.replace(rowsOf(DEFAULT_TIERS));
			await cards.replace(rowsOf(preset.cards));
		},
	};
}
