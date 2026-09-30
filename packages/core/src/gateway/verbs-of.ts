import type { CanResult } from "./contract";
import { isObject } from "../engine/is-object";

export type LooseVerb = (input?: unknown) => unknown;

export type LooseAction = ((input?: unknown) => Promise<unknown>) & { can(): CanResult };

export function verbOf(gateway: unknown, verb: string): unknown {
	return isObject(gateway) ? gateway[verb] : undefined;
}

export function isVerb(held: unknown): held is LooseVerb {
	return typeof held === "function";
}

export function isAction(held: unknown): held is LooseAction {
	return typeof held === "function" && "can" in held && typeof held.can === "function";
}

export function actionOf(gateway: unknown, verb: string): LooseAction | null {
	const held = verbOf(gateway, verb);
	return isAction(held) ? held : null;
}

export function callVerbOf(gateway: unknown, verb: string, ...input: [] | [unknown]): unknown {
	const held = verbOf(gateway, verb);
	return isVerb(held) ? held.call(gateway, ...input) : undefined;
}
