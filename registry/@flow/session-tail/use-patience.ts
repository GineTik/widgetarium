import { useEffect, useState } from "react";
import type { Stage } from "./types";

const PATIENT_MS = 200;
const SLOW_MS = 5000;

export function usePatience(isLoading: boolean) {
	const [stage, setStage] = useState<Stage>("quiet");
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		setStage("quiet");
		setSeconds(0);
		if (!isLoading) return undefined;
		const startedAt = Date.now();
		const patient = setTimeout(() => setStage("waiting"), PATIENT_MS);
		const slow = setTimeout(() => setStage("slow"), SLOW_MS);
		const tick = setInterval(() => setSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
		return () => {
			clearTimeout(patient);
			clearTimeout(slow);
			clearInterval(tick);
		};
	}, [isLoading]);

	return { stage, seconds };
}
