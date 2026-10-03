import { useState } from "react";
import type { CommandAnswer } from "widgetarium";

export function useCommandPress(send: () => Promise<CommandAnswer>) {
	const [isBusy, setBusy] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const press = () => {
		if (isBusy) return;
		setBusy(true);
		setFailure(null);
		void send().then((answer) => {
			setBusy(false);
			setFailure(answer.ok ? null : answer.reason);
		});
	};
	return { isBusy, failure, press };
}
