import { useEffect, useRef } from "react";
import type { AnyGateway, GatewayRefs } from "../gateway/refs.js";

type PublishedRef = readonly [string, AnyGateway];

export function useDropsOnUnmount(refs: GatewayRefs, published: readonly PublishedRef[]): void {
	const publishedRef = useRef<readonly PublishedRef[]>([]);
	publishedRef.current = published;
	useEffect(
		() => () => {
			for (const [ref, gateway] of publishedRef.current) refs.drop(ref, gateway);
		},
		[refs],
	);
}
