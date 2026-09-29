import { toneClass } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";
import { useState, type ReactNode } from "react";
import { nameOf, pictureOf, toneForSeed, type Picture } from "@default/lib";
import { Attachment } from "./attachment";
import type { CardRecord } from "./types";

export function Face({ card }: { card: CardRecord }) {
	const drawn = pictureOf(card) as Picture;
	const [hasFailed, setFailed] = useState(false);
	const tone = drawn.kind === "emoji" ? "neutral" : toneForSeed(nameOf(card));
	const face = (held: ReactNode) => <span className={`wr-face ${toneClass(tone)}`}>{held}</span>;

	if (drawn.kind === "emoji") return face(<Emoji name={drawn.name} size={34} />);
	if (drawn.kind === "remote" && !hasFailed)
		return face(<img src={drawn.src} alt="" draggable={false} onError={() => setFailed(true)} />);
	if (drawn.kind === "vault") return face(<Attachment markdown={drawn.markdown} letters={drawn.letters} />);
	return face(drawn.letters);
}
