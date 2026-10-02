import type { ImplementationPorts, NetworkAsk } from "@widgetarium/core/engine/packs.js";

const NO_URL = "no address: type the URL in the settings window";
const NOT_ANSWERED = "{url} answered {status}";
const NOT_JSON = "{url} answered something that is not JSON";

export async function fetchJson(
	ports: ImplementationPorts,
	url: string | undefined,
	ask: NetworkAsk = {},
): Promise<unknown> {
	const address = url?.trim();
	if (!address) throw new Error(NO_URL);
	const answer = await ports.network.request(address, ask);
	if (answer.status < 200 || answer.status >= 300)
		throw new Error(NOT_ANSWERED.replace("{url}", address).replace("{status}", String(answer.status)));
	if (answer.text.trim() === "") return null;
	try {
		const parsed: unknown = JSON.parse(answer.text);
		return parsed;
	} catch {
		throw new Error(NOT_JSON.replace("{url}", address));
	}
}

export function valueAt(held: unknown, path: string | undefined): unknown {
	const steps = (path ?? "").split(".").filter((step) => step !== "");
	return steps.reduce<unknown>(
		(within, step) => (typeof within === "object" && within !== null ? Reflect.get(within, step) : undefined),
		held,
	);
}
