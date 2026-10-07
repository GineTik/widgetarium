import { useState } from "react";

export interface FormMarks {
	readonly touched: ReadonlySet<string>;
	readonly changed: ReadonlySet<string>;
	readonly submitCount: number;
	readonly markTouched: (name: string) => void;
	readonly markChanged: (name: string) => void;
	readonly markSubmitted: () => void;
	readonly clear: () => void;
}

const NOTHING: ReadonlySet<string> = new Set();

export function useFormMarks(): FormMarks {
	const [touched, setTouched] = useState(NOTHING);
	const [changed, setChanged] = useState(NOTHING);
	const [submitCount, setSubmitCount] = useState(0);
	return {
		touched,
		changed,
		submitCount,
		markTouched: (name) => setTouched((held) => (held.has(name) ? held : new Set([...held, name]))),
		markChanged: (name) => setChanged((held) => (held.has(name) ? held : new Set([...held, name]))),
		markSubmitted: () => setSubmitCount((count) => count + 1),
		clear: () => {
			setTouched(NOTHING);
			setChanged(NOTHING);
			setSubmitCount(0);
		},
	};
}
