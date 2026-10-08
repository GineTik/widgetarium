import { useLayoutEffect } from "react";
import type { RefObject } from "react";

export const ENABLED_RADIO = "[role='radio']:not([disabled])";

export function useRadioTabStop(groupRef: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const radios = [...(groupRef.current?.querySelectorAll<HTMLElement>("[role='radio']") ?? [])];
		const stop =
			radios.find((radio) => radio.getAttribute("aria-checked") === "true" && radio.matches(ENABLED_RADIO)) ??
			radios.find((radio) => radio.matches(ENABLED_RADIO));
		for (const radio of radios) radio.tabIndex = radio === stop ? 0 : -1;
	});
}
