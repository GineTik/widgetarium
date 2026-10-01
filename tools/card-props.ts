import type { DeclaredProp } from "../packages/core/src/gateway/props.js";
import { isRecord } from "./page-dom.ts";

export function declaredPropIn(held: unknown, what: string): DeclaredProp {
	if (!isRecord(held)) throw new TypeError(`${what} is no declared prop`);
	return held;
}
