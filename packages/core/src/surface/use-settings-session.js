import { useRef, useState } from "react";

// TRADE-OFF: the panels fade before the box returns, so closing does not read as a snap
const SETTINGS_FADE_MS = 140;

export function useSettingsSession({ staged, setStaged }, save, boardAsItStands) {
	const [settingsTile, setSettingsTile] = useState(null);
	const [closingTile, setClosingTile] = useState(null);
	const sessionRef = useRef(0);

	const open = (id, canvasBox = null, entryPath = null) => {
		sessionRef.current += 1;
		setClosingTile(null);
		setStaged(boardAsItStands());
		setSettingsTile({ id, key: String(sessionRef.current), canvasBox, entryPath });
	};

	const close = (isDone = false) => {
		const held = settingsTile;
		const draft = staged;
		setSettingsTile(null);
		setStaged(null);
		if (isDone && draft) save(draft, true);
		if (!held) return;
		setClosingTile(held);
		window.setTimeout(() => setClosingTile((current) => (current === held ? null : current)), SETTINGS_FADE_MS);
	};

	return { held: settingsTile ?? closingTile, isOpen: settingsTile !== null, open, close };
}
