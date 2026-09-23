import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";
import { EMOJI_TABLE, EMOJI_VIEW_BOX } from "./emoji-table";

function spokenEmoji(name) {
	return String(name ?? "").replace(/-/g, " ");
}

export function Emoji({ name, size = 20, className: cls, label }: LooseProps) {
	const body = Object.hasOwn(EMOJI_TABLE, name) ? EMOJI_TABLE[name] : null;
	if (!body) {
		if (name) console.warn(`Widgetarium: no emoji is drawn under the name "${name}"`);
		return null;
	}
	return (
		<svg
			className={cx("wg-kit-emoji", cls)}
			viewBox={EMOJI_VIEW_BOX}
			width={size}
			height={size}
			role="img"
			aria-label={label ?? spokenEmoji(name)}
			dangerouslySetInnerHTML={{ __html: body }}
		/>
	);
}
