import { useState } from "react";
import { actionFor } from "./catalogue-entries.js";

const COULD_NOT_FETCH = "could not fetch this widget";

export function useInstallPress({ entry, mode, onPick, onInstall }) {
	const [isBusy, setBusy] = useState(false);
	const [step, setStep] = useState(null);
	const [failure, setFailure] = useState(null);
	const id = entry.manifest?.id;
	const state = failure ? "failed" : isBusy ? "busy" : actionFor(entry);

	const press = async () => {
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
