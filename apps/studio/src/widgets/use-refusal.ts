import { useState } from "react";

type Answer = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface Refusal {
	readonly refusal: string | null;
	readonly isAnsweredOk: (answer: Promise<Answer>) => Promise<boolean>;
}

export function useRefusal(): Refusal {
	const [refusal, setRefusal] = useState<string | null>(null);
	const isAnsweredOk = async (answer: Promise<Answer>): Promise<boolean> => {
		const heard = await answer;
		setRefusal(heard.ok ? null : heard.reason);
		return heard.ok;
	};
	return { refusal, isAnsweredOk };
}
