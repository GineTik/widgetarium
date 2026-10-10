import { createElement as h, useCallback, useState } from "react";
import type { ReactElement } from "react";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";

export type Report = (running: Promise<void>, said: string) => Promise<boolean>;

export interface FailureLine {
	readonly failure: string | null;
	readonly report: Report;
}

const FAILED = "{said}: {why}";

export function useFailureLine(): FailureLine {
	const [failure, setFailure] = useState<string | null>(null);
	const report = useCallback<Report>(async (running, said) => {
		setFailure(null);
		try {
			await running;
			return true;
		} catch (failed: unknown) {
			console.error(`[widgetarium] ${said}`, failed);
			setFailure(FAILED.replace("{said}", capitalized(said)).replace("{why}", failureMessage(failed)));
			return false;
		}
	}, []);
	return { failure, report };
}

export function FailureSaid({ failure }: { readonly failure: string | null }): ReactElement | null {
	if (failure === null) return null;
	return h("p", { className: "wg-studio-ai-failure is-quiet", role: "alert" }, failure);
}

function capitalized(said: string): string {
	return `${said.charAt(0).toUpperCase()}${said.slice(1)}`;
}
