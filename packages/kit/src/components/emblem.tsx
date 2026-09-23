import type { LooseProps } from "../types";
import { createElement as h, useState } from "react";
import { EmblemDiceBear } from "./emblem-dice-bear";
import { EmblemFallback } from "./emblem-fallback";
import { EmblemImage } from "./emblem-image";
import { EMBLEM_SHAPES, EMBLEM_SIZES, EMBLEM_STATUS } from "../constants/emblem";
import { cx } from "../utils/cx";

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

Emblem.Image = EmblemImage;

Emblem.DiceBear = EmblemDiceBear;

Emblem.Fallback = EmblemFallback;
