const SETTLE_DURATION = "--wg-grow";

const SETTLE_EASING = "--wg-spring";

const FALLBACK_MS = 320;

export function settleMotionOf(tokensFrom: Element): KeyframeEffectOptions {
	const style = getComputedStyle(tokensFrom);
	return {
		duration: millisecondsOf(style.getPropertyValue(SETTLE_DURATION)),
		easing: style.getPropertyValue(SETTLE_EASING).trim() || "ease-out",
	};
}

function millisecondsOf(written: string): number {
	const number = parseFloat(written);
	if (Number.isNaN(number)) return FALLBACK_MS;
	return written.trim().endsWith("ms") ? number : number * 1000;
}
