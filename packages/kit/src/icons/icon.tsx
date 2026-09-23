import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { iconOf } from "./glyphs";
import { cx } from "../utils/cx";

export function Icon({ name, fallback, size = 16, className: cls }: LooseProps) {
	const drawn = iconOf(name) ?? (fallback ? iconOf(fallback) : null);
	if (!drawn) return null;
	return (
		<svg
			className={cx("wg-kit-icon-glyph", drawn.isLucide && "is-lucide", cls)}
			viewBox={drawn.viewBox}
			width={size}
			height={size}
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: drawn.body }}
		/>
	);
}
