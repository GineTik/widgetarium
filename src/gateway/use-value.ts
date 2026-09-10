import type { ValueGateway } from "./contract";
import { soloGateway } from "./create";
import { useData } from "./use-data";

// TODO: wrap what a slot feeds in a gateway, then this two-shape reader goes
const NOTHING = soloGateway<unknown>(null, {}, "nothing");

const isGateway = (held: unknown): held is ValueGateway<unknown> =>
	typeof (held as { get?: unknown } | null)?.get === "function";

export function useValue<T>(held: ValueGateway<T> | T | null | undefined): T | null {
	const bound = isGateway(held) ? (held as ValueGateway<unknown>) : NOTHING;
	const state = useData(bound.get);
	return (isGateway(held) ? state.data : (held ?? null)) as T | null;
}
