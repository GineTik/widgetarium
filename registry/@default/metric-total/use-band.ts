import { useLayoutEffect, useState } from "react";
import type { Band } from "./types";

const BANDS: Band[] = ["wide", "mid", "narrow", "floor"];
const BAND_READ_FROM = "--mt3-band";

export function useBand(held: { current: HTMLElement | null }): Band {
	const [band, setBand] = useState<Band>("wide");
	useLayoutEffect(() => {
		const node = held.current;
		if (!node) return undefined;
		const read = () => setBand(bandOf(node));
		read();
		const watch = new ResizeObserver(read);
		watch.observe(node);
		return () => watch.disconnect();
	}, [held]);
	return band;
}

function bandOf(node: HTMLElement): Band {
	const said = getComputedStyle(node).getPropertyValue(BAND_READ_FROM).trim();
	return BANDS.find((one) => one === said) ?? "wide";
}
