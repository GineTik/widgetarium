import { useEffect, useRef } from "react";
import type { QuestionStatus } from "../constants/questionnaire";

export function useStatusTold(read: QuestionStatus | null, told: ((status: QuestionStatus) => void) | undefined): void {
	const was = useRef<QuestionStatus | null>(null);
	useEffect(() => {
		if (read === null || was.current === read) return;
		const isFirstRead = was.current === null;
		was.current = read;
		if (!isFirstRead) told?.(read);
	}, [read]);
}
