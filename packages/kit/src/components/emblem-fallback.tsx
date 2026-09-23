import type { LooseProps } from "../types";
import { createElement as h, useContext } from "react";
import { PlaceholderMark } from "./placeholder-mark";
import { EMBLEM_STATUS } from "../constants/emblem";
import { cx } from "../utils/cx";

export function EmblemFallback({ seed, className: cls, children }: LooseProps) {
	const { status } = useContext(EMBLEM_STATUS);
	if (status === "loaded" || status === "refused") return null;
	if (children) return <span className={cx("wg-kit-emblem-fallback", cls)}>{children}</span>;
	return <PlaceholderMark seed={seed} className={cls} />;
}
