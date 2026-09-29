import { toneClass } from "widgetarium/kit";
import { createPortal } from "react-dom";
import { nameOf } from "./cards";
import { toneForSeed } from "./tones";
import { Face } from "./face";
import type { Carry } from "./types";

export function Carried({ carry, size }: { carry: Carry; size: number }) {
	const tone = toneForSeed(nameOf(carry.row));
	return createPortal(
		<div
			className={`wg-portal wg-rank wr-carried ${toneClass(tone)}`}
			style={
				{
					left: `${carry.x - carry.offX}px`,
					top: `${carry.y - carry.offY}px`,
					"--wg-rank-card": `${size}px`,
				} as Record<string, string>
			}
		>
			<Face card={carry.row} />
		</div>,
		document.body,
	);
}
