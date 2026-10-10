import { useEffect, useState } from "react";
import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";

export type SetupRead =
	| { readonly state: "reading" }
	| { readonly state: "read"; readonly setup: AssistantSetup; readonly failure: string | null }
	| { readonly state: "failed"; readonly failure: string };

const READING: SetupRead = { state: "reading" };
const NOT_REREAD = "The assistant's setup could not be read again: {why}";

export function useAssistantSetup(port: AssistantPort, initial: AssistantSetup | null): SetupRead {
	const [read, setRead] = useState<SetupRead>(() =>
		initial ? { state: "read", setup: initial, failure: null } : READING,
	);
	const [startsUnread] = useState(initial === null);
	useEffect(() => {
		let isLive = true;
		const reread = (): void => {
			port.setup().then(
				(setup) => {
					if (isLive) setRead({ state: "read", setup, failure: null });
				},
				(failure: unknown) => {
					console.error("[widgetarium] the assistant's setup could not be read", failure);
					if (isLive) setRead((held) => failedOver(held, failureMessage(failure)));
				},
			);
		};
		if (startsUnread) reread();
		const stopWatching = port.onSetup(reread);
		return () => {
			isLive = false;
			stopWatching();
		};
	}, [port, startsUnread]);
	return read;
}

function failedOver(held: SetupRead, why: string): SetupRead {
	if (held.state !== "read") return { state: "failed", failure: why };
	return { ...held, failure: NOT_REREAD.replace("{why}", why) };
}
