import { z } from "zod";
import type { AdaptedGateway } from "./adapted";
import type { Action, CanResult } from "./contract";
import type { ActionMeta } from "./create";
import { isPageSchema, PageInputSchema, pageOverListing } from "./page";
import { fitOutput } from "./run-handler";

export interface AskedShape {
	readonly input: z.ZodType;
	readonly output: z.ZodType;
}

export type AskedRead = Action<unknown, unknown> & { readonly meta: ActionMeta };

type Answering = (asked: unknown, signal?: AbortSignal) => Promise<unknown>;

const ANSWER_REFUSED = 'prop "{name}" was answered with an output its schema refuses: {why}';

const PAGE_WINDOW = z.object(PageInputSchema.shape);

export function askedReadOf(name: string, shape: AskedShape, gateway: AdaptedGateway): AskedRead {
	const answer = answeringOf(gateway, shape);
	const ask = async (input: unknown, signal?: AbortSignal): Promise<unknown> => {
		const fitted = fitOutput(shape.output, await answer(input, signal));
		if (!fitted.ok) throw new Error(ANSWER_REFUSED.replace("{name}", name).replace("{why}", fitted.reason));
		return fitted.output;
	};
	const meta: ActionMeta = {
		gatewayId: gateway.id,
		verb: "query",
		subscribe: gateway.subscribe,
		isPaged: isPageSchema(shape.output),
	};
	return Object.assign(ask, { can: () => canOfRead(gateway), meta });
}

function answeringOf(gateway: AdaptedGateway, shape: AskedShape): Answering {
	const query: unknown = Reflect.get(gateway, "query");
	if (isCallable(query)) return (asked, signal) => query(asked, signal);
	if (gateway.kind === "collection")
		return (asked) => pageOverListing((window) => gateway.list(window), PAGE_WINDOW.parse(shape.input.parse(asked)));
	return () => gateway.get();
}

function canOfRead(gateway: AdaptedGateway): CanResult {
	return gateway.kind === "collection" ? gateway.list.can() : gateway.get.can();
}

function isCallable(held: unknown): held is Answering {
	return typeof held === "function";
}
