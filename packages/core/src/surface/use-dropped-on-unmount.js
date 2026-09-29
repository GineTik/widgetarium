import { useEffect, useRef } from "react";

export function useDroppedOnUnmount(refs, published) {
	const publishedRef = useRef([]);
	publishedRef.current = published;
	useEffect(
		() => () => {
			for (const [ref, gateway] of publishedRef.current) refs.drop(ref, gateway);
		},
		[refs],
	);
}
