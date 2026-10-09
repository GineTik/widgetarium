import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../utils/reduced-motion";
import { settleMotionOf } from "../utils/settle-motion";

export interface DraggedThumb {
	readonly at: number;
	readonly value: number;
}

export interface DraggedThumbs {
	readonly dragged: DraggedThumb | null;
	readonly follow: (next: DraggedThumb) => void;
	readonly settle: (to: number, tokensFrom: Element | null) => void;
}

export function useDraggedThumb(): DraggedThumbs {
	const [dragged, setDragged] = useState<DraggedThumb | null>(null);
	const latest = useRef<DraggedThumb | null>(null);
	const motion = useRef<Animation | null>(null);
	const show = (next: DraggedThumb | null): void => {
		latest.current = next;
		setDragged(next);
	};
	useEffect(() => () => motion.current?.cancel(), []);
	return {
		dragged,
		follow: (next) => {
			motion.current?.cancel();
			show(next);
		},
		settle: (to, tokensFrom) => {
			const from = latest.current;
			if (!from || !tokensFrom || !canAnimate()) return show(null);
			motion.current = settled(from, to, { tokensFrom, show });
		},
	};
}

function canAnimate(): boolean {
	return typeof KeyframeEffect !== "undefined" && !prefersReducedMotion();
}

interface SettleAsk {
	readonly tokensFrom: Element;
	readonly show: (next: DraggedThumb | null) => void;
}

function settled(from: DraggedThumb, to: number, { tokensFrom, show }: SettleAsk): Animation {
	const motion = new Animation(new KeyframeEffect(null, null, settleMotionOf(tokensFrom)));
	const frame = (): void => {
		const progress = motion.effect?.getComputedTiming().progress;
		if (motion.playState !== "running" || progress === null || progress === undefined) return;
		show({ at: from.at, value: from.value + (to - from.value) * progress });
		requestAnimationFrame(frame);
	};
	motion.onfinish = () => show(null);
	motion.play();
	requestAnimationFrame(frame);
	return motion;
}
