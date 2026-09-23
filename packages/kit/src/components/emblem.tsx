import { createElement as h, useContext, useLayoutEffect, useState } from "react";
import { EMBLEM_SHAPES, EMBLEM_SIZES, EMBLEM_STATUS } from "../constants/emblem";
import { MARK_VIEW_BOX } from "../constants/marks";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cx } from "../utils/cx";
import { diceBearUrl, diceBearVerdict } from "../utils/dicebear";
import { markOf, pathOf } from "../utils/marks";
import { warnOnce } from "../utils/surface";
import { toneClass } from "../utils/tones";

export function Emblem({ size = "m", shape = "circle", label, className: cls, style, children }: LooseProps) {
	const [status, setStatus] = useState("idle");
	const px = EMBLEM_SIZES[size] ?? size;
	return (
		<EMBLEM_STATUS.Provider value={{ status, setStatus }}>
			<span
				className={cx("wg-kit-emblem", `is-${EMBLEM_SHAPES.includes(shape) ? shape : "circle"}`, cls)}
				style={{ ...style, "--wg-emblem-size": typeof px === "number" ? `${px}px` : px }}
				role={label ? "img" : undefined}
				aria-label={label}
			>
				{children}
			</span>
		</EMBLEM_STATUS.Provider>
	);
}

// TODO: drop the dot aliases once the vault's @default copy is reinstalled
Emblem.Image = EmblemImage;

Emblem.DiceBear = EmblemDiceBear;

Emblem.Fallback = EmblemFallback;

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

export function EmblemDiceBear({ style, seed, options, className: cls }: LooseProps) {
	const { setStatus } = useContext(EMBLEM_STATUS);
	const verdict = diceBearVerdict(style);
	useLayoutEffect(() => {
		if (!verdict.refusal) return;
		setStatus("refused");
		warnOnce(`a DiceBear emblem drew nothing — ${verdict.refusal}`);
	}, [verdict.refusal]);
	if (verdict.refusal) return <EmblemRefused reason={verdict.refusal} className={cls} />;
	return <EmblemImage src={diceBearUrl(style, seed, options)} title={verdict.credit} className={cls} />;
}

const LICENCE_REFUSED = "Unavailable for licensing reasons: {reason}";

function EmblemRefused({ reason, className: cls }: LooseProps) {
	return (
		<span className={cx("wg-kit-emblem-refused", cls)} title={LICENCE_REFUSED.replace("{reason}", reason)}>
			<Icon name="ban" size={16} />
		</span>
	);
}

export function EmblemFallback({ seed, className: cls, children }: LooseProps) {
	const { status } = useContext(EMBLEM_STATUS);
	if (status === "loaded" || status === "refused") return null;
	if (children) return <span className={cx("wg-kit-emblem-fallback", cls)}>{children}</span>;
	return <PlaceholderMark seed={seed} className={cls} />;
}

export function PlaceholderMark({ seed, shape, tone, size = "100%", className: cls }: LooseProps) {
	const held = markOf(seed);
	return (
		<span
			className={cx("wg-kit-mark", "wg-kit-tone", toneClass(tone ?? held.tone), cls)}
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<svg viewBox={MARK_VIEW_BOX} focusable="false">
				<path d={pathOf(shape) ?? pathOf(held.shape)} fillRule="evenodd" />
			</svg>
		</span>
	);
}
