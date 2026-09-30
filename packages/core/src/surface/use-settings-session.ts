import { useRef, useState } from "react";
import type { Board } from "../model.js";
import type { MountStep } from "../settings/use-settings-look.js";
import type { DraftBoard, SaveBoard } from "./use-draft-board.js";
import type { CellSize } from "./tile-actions.js";

// TRADE-OFF: the panels fade before the box returns, so closing does not read as a snap
const SETTINGS_FADE_MS = 140;

export interface SettingsTile {
	readonly id: string;
	readonly key: string;
	readonly canvasBox: CellSize | null;
	readonly entryPath: readonly MountStep[] | null;
}

export interface SettingsSession {
	readonly held: SettingsTile | null;
	readonly isOpen: boolean;
	readonly open: (id: string, canvasBox?: CellSize | null, entryPath?: readonly MountStep[] | null) => void;
	readonly close: (isDone?: boolean) => void;
}

export function useSettingsSession(
	{ staged, setStaged }: Pick<DraftBoard, "staged" | "setStaged">,
	save: SaveBoard,
	boardAsItStands: () => Board,
): SettingsSession {
	const [settingsTile, setSettingsTile] = useState<SettingsTile | null>(null);
	const [closingTile, setClosingTile] = useState<SettingsTile | null>(null);
	const sessionRef = useRef(0);

	const open: SettingsSession["open"] = (id, canvasBox = null, entryPath = null) => {
		sessionRef.current += 1;
		setClosingTile(null);
		setStaged(boardAsItStands());
		setSettingsTile({ id, key: String(sessionRef.current), canvasBox, entryPath });
	};

	const close: SettingsSession["close"] = (isDone = false) => {
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
