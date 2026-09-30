import { createElement as h } from "react";
import type { ReactElement } from "react";
import { iconOf } from "./glyphs";
import { cn } from "../utils/cn";

export interface IconProps {
	readonly name: string;
	readonly fallback?: string | undefined;
	readonly size?: number | string;
	readonly className?: string | undefined;
}

const ICON_PX = 16;

export function Icon({ name, fallback, size = ICON_PX, className: cls }: IconProps): ReactElement | null {
	const drawn = iconOf(name) ?? (fallback ? iconOf(fallback) : null);
	if (!drawn) return null;
	return (
		<svg
			className={cn("wg-kit-icon-glyph", drawn.isLucide && "is-lucide", cls)}
			viewBox={drawn.viewBox}
			width={size}
			height={size}
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: drawn.body }}
		/>
	);
}
