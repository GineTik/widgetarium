import { z } from "zod";
import type { CanResult } from "./contract";

export type CommandAnswer<Output = void> =
	| { readonly ok: true; readonly output: Output }
	| { readonly ok: false; readonly reason: string; readonly ran: boolean };

export type Fitted = { readonly ok: true; readonly output: unknown } | { readonly ok: false; readonly reason: string };

export interface HandlerContract {
	readonly output: z.ZodType | undefined;
	readonly name: string;
}

export class AnsweringCommand {
	constructor(
		readonly can: () => CanResult,
		readonly run: (input: unknown) => Promise<CommandAnswer<unknown>>,
	) {}
}

const RUNS_NOTHING = "{name} has no run";
const OUTPUT_DOES_NOT_FIT = "{name} answered an output its schema refuses: {why}";

export function fitOutput(schema: z.ZodType | undefined, value: unknown): Fitted {
	if (!schema) return { ok: true, output: undefined };
	const parsed = schema.safeParse(value);
	return parsed.success ? { ok: true, output: parsed.data } : { ok: false, reason: z.prettifyError(parsed.error) };
}

export function answerAfterRun(name: string, schema: z.ZodType | undefined, value: unknown): CommandAnswer<unknown> {
	const fitted = fitOutput(schema, value);
	if (fitted.ok) return fitted;
	const reason = OUTPUT_DOES_NOT_FIT.replace("{name}", name).replace("{why}", fitted.reason);
	console.error(`Widgetarium: command "${name}" ran → output refused`, reason);
	return { ok: false, reason, ran: true };
}

export async function runHandler(
	handler: object,
	input: unknown,
	{ output, name }: HandlerContract,
): Promise<CommandAnswer<unknown>> {
	const run: unknown = Reflect.get(handler, "run");
	if (typeof run !== "function") return { ok: false, reason: RUNS_NOTHING.replace("{name}", name), ran: false };
	try {
		return answerAfterRun(name, output, await Reflect.apply(run, handler, [input]));
	} catch (failure: unknown) {
		console.error(`Widgetarium: command "${name}" failed`, failure);
		return { ok: false, reason: failure instanceof Error ? failure.message : String(failure), ran: false };
	}
}
