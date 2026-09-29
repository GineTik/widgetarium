import { settingsDialog } from "./settings/settings-dialog.js";
import { contextAt, settingsState } from "./settings/settings-state.js";
import { useBoxValues } from "./settings/use-box-values.js";
import { useCloseLadder } from "./settings/use-close-ladder.js";
import { useHoldsScroll } from "./settings/use-holds-scroll.js";
import { useSettingsLook } from "./settings/use-settings-look.js";
import { useVaultFields } from "./settings/use-vault-fields.js";
import { useViewport } from "./settings/use-viewport.js";
import { vaultPathsOf } from "./settings/vault-paths.js";
import { windowGeometry } from "./settings/window-geometry.js";

export function useSettingsWindow(options) {
	const { host, refs, session, entryPath, onDismiss } = options;
	const look = useSettingsLook(session, entryPath);
	const viewport = useViewport();
	useHoldsScroll(look.open);
	const here = contextAt(options, look.view.path);
	const vaultFields = useVaultFields(host, vaultPathsOf(here.manifest, here.tile));
	const boxValues = useBoxValues(refs, look.open);
	const closeOne = useCloseLadder(look, onDismiss);

	if (!look.open && !look.closing) return { shown: false, dialog: null };

	const geometry = windowGeometry(options, look.view, viewport);
	const state = settingsState({ options, look, here, geometry, vaultFields, boxValues });
	return { shown: true, live: geometry.live, dialog: settingsDialog(state, geometry, options, look.closing, closeOne) };
}
