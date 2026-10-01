import type { GatewayBase } from "../packages/core/src/gateway/contract.ts";

type Kinded = GatewayBase & { readonly kind: "collection" | "value" };

export function collectionOf<G extends Kinded>(
	gateway: G | null | undefined,
): Extract<G, { readonly kind: "collection" }> {
	if (!isOfKind(gateway, "collection")) throw new TypeError(`${gateway?.id ?? "the gateway"} is not a collection`);
	return gateway;
}

export function valueGatewayOf<G extends Kinded>(
	gateway: G | null | undefined,
): Extract<G, { readonly kind: "value" }> {
	if (!isOfKind(gateway, "value")) throw new TypeError(`${gateway?.id ?? "the gateway"} is not a value`);
	return gateway;
}

export function updateOf(gateway: object): (input: unknown) => Promise<unknown> {
	const update: unknown = Reflect.get(gateway, "update");
	if (typeof update !== "function") throw new TypeError("the gateway has no update");
	return async (input) => Reflect.apply(update, gateway, [input]);
}

function isOfKind<G extends Kinded, K extends Kinded["kind"]>(
	gateway: G | null | undefined,
	kind: K,
): gateway is Extract<G, { readonly kind: K }> {
	return gateway?.kind === kind;
}
