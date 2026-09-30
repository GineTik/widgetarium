import { createElement as h, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { EMBLEM_STATUS } from "../constants/emblem";
import { cn } from "../utils/cn";
import { PlaceholderMark } from "./placeholder-mark";

export interface EmblemFallbackProps {
	readonly seed?: unknown;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function EmblemFallback({ seed, className: cls, children }: EmblemFallbackProps): ReactElement | null {
	const { status } = useContext(EMBLEM_STATUS);
	if (status === "loaded" || status === "refused") return null;
	if (children) return <span className={cn("wg-kit-emblem-fallback", cls)} children={children} />;
	return <PlaceholderMark seed={seed} className={cls} />;
}
