import type { LooseProps } from "../types";
import { createElement as h, useContext, useLayoutEffect } from "react";
import { EmblemImage } from "./emblem-image";
import { EmblemRefused } from "./emblem-refused";
import { EMBLEM_STATUS } from "../constants/emblem";
import { diceBearUrl, diceBearVerdict } from "../utils/dicebear";
import { warnOnce } from "../utils/surface";

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
