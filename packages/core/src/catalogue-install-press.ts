import { useState } from "react";
import { actionFor } from "./catalogue-entries.js";
import type { CatalogueDefinition, EntryAction, MergedEntry } from "./catalogue-entries.js";
import type { FetchProgress, OnFetchStep } from "./engine/widget-source.js";

export type PressState = EntryAction | "busy" | "failed";

export type CatalogueMode = "browse" | "place" | "fill" | "text" | "mount" | "template";

interface InstallAnswer {
	readonly ok: boolean;
	readonly failure?: string | null;
}

export type OnPick = (id: string, mode: CatalogueMode) => unknown;

export type OnInstall = (listed: CatalogueDefinition, onStep: OnFetchStep) => Promise<InstallAnswer | null | undefined>;

interface InstallPressAsk {
	readonly entry: MergedEntry;
	readonly mode: CatalogueMode;
	readonly onPick?: OnPick | undefined;
	readonly onInstall?: OnInstall | undefined;
}

interface InstallPress {
	readonly state: PressState;
	readonly step: FetchProgress | null;
	readonly failure: string | null;
	readonly press: () => Promise<unknown>;
}

const COULD_NOT_FETCH = "could not fetch this widget";

export function useInstallPress({ entry, mode, onPick, onInstall }: InstallPressAsk): InstallPress {
	const [isBusy, setBusy] = useState(false);
	const [step, setStep] = useState<FetchProgress | null>(null);
	const [failure, setFailure] = useState<string | null>(null);
	const id = String(entry.manifest["id"]);
	const state = pressStateOf(entry, isBusy, failure);

	const press = async (): Promise<unknown> => {
		if (isBusy) return undefined;
		if (state === "add") return onPick?.(id, mode);
		setBusy(true);
		setFailure(null);
		setStep(null);
		const done = await onInstall?.(entry.offer ?? entry.definition, setStep);
		setBusy(false);
		setStep(null);
		if (!done?.ok) return setFailure(done?.failure ?? COULD_NOT_FETCH);
		return onPick?.(id, mode);
	};

	return { state, step, failure, press };
}

function pressStateOf(entry: MergedEntry, isBusy: boolean, failure: string | null): PressState {
	if (failure) return "failed";
	if (isBusy) return "busy";
	return actionFor(entry);
}
