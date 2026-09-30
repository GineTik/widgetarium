import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { EMOJI_TABLE, EMOJI_VIEW_BOX } from "./emoji-table";

export interface EmojiProps {
	readonly name: string;
	readonly size?: number | string;
	readonly className?: string | undefined;
	readonly label?: string | undefined;
}

const EMOJI_BODIES: Readonly<Record<string, string>> = EMOJI_TABLE;

const EMOJI_PX = 20;

export function Emoji({ name, size = EMOJI_PX, className: cls, label }: EmojiProps): ReactElement | null {
	const body = Object.hasOwn(EMOJI_BODIES, String(name)) ? EMOJI_BODIES[String(name)] : undefined;
	if (!body) {
		if (name) console.warn(`Widgetarium: no emoji is drawn under the name "${name}"`);
		return null;
	}
	return (
		<svg
			className={cn("wg-kit-emoji", cls)}
			viewBox={EMOJI_VIEW_BOX}
			width={size}
			height={size}
			role="img"
			aria-label={label ?? spokenEmoji(name)}
			dangerouslySetInnerHTML={{ __html: body }}
		/>
	);
}

function spokenEmoji(name: unknown): string {
	return String(name ?? "").replace(/-/g, " ");
}
