import type { LooseProps } from "../types";
import { createElement as h, useContext, useLayoutEffect } from "react";
import { EMBLEM_STATUS } from "../constants/emblem";
import { cx } from "../utils/cx";

export function EmblemImage({ src, alt = "", className: cls, ...rest }: LooseProps) {
	const { status, setStatus } = useContext(EMBLEM_STATUS);
	useLayoutEffect(() => {
		if (!src) return setStatus("failed");
		setStatus("loading");
		const probe = new Image();
		probe.onload = () => setStatus("loaded");
		probe.onerror = () => setStatus("failed");
		probe.src = src;
		return () => {
			probe.onload = null;
			probe.onerror = null;
		};
	}, [src]);
	if (status !== "loaded") return null;
	return <img {...rest} src={src} alt={alt} className={cx("wg-kit-emblem-image", cls)} draggable={false} />;
}
