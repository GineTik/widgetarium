import type { MetricProps } from "./types";

const WHO_FAILED = "[widgetarium] metric-total:";

export async function writtenOrNotified(host: MetricProps["host"], write: Promise<unknown>, said: string) {
	try {
		await write;
		return true;
	} catch (failure) {
		host?.ui?.notify(said);
		console.error(`${WHO_FAILED} ${said}`, failure);
		return false;
	}
}
