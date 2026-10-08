import { useState } from "react";
import type { ToastId } from "../utils/toast-queue";
import { stackOf } from "../utils/toast-stack";
import type { ToastStack } from "../utils/toast-stack";
import { useDrivesToastClock } from "./use-drives-toast-clock";
import { useToastHeights } from "./use-toast-heights";
import { useToasts } from "./use-toasts";

export interface ToasterStackAsk {
	readonly durationMs: number;
	readonly visibleCount: number;
}

export interface ToasterStack {
	readonly stack: ToastStack;
	readonly reportHeight: (id: ToastId, height: number) => void;
	readonly isHovered: boolean;
	readonly setHovered: (isHovered: boolean) => void;
}

export function useToasterStack({ durationMs, visibleCount }: ToasterStackAsk): ToasterStack {
	const records = useToasts();
	const { heights, report } = useToastHeights();
	const [isHovered, setHovered] = useState(false);
	useDrivesToastClock({ defaultDurationMs: durationMs, isPaused: isHovered });
	return { stack: stackOf(records, heights, visibleCount), reportHeight: report, isHovered, setHovered };
}
