import type { CommandAnswer } from "widgetarium";
import type { MetricProps } from "./types";

const WHO_FAILED = "[widgetarium] metric-total:";

export async function writeOrNotify(host: MetricProps["host"], write: Promise<CommandAnswer>, said: string) {
	const answer = await write;
	if (answer.ok) return true;
	host?.ui?.notify(said);
	console.error(`${WHO_FAILED} ${said}`, answer.reason);
	return false;
}
