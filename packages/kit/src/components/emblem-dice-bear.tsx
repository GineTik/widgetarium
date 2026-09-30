import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { EMBLEM_STATUS } from "../constants/emblem";
import { useRefusedEmblem } from "../hooks/use-refused-emblem";
import { diceBearUrl, diceBearVerdict } from "../utils/dicebear";
import type { DiceBearOptions } from "../utils/dicebear";
import { EmblemImage } from "./emblem-image";
import { EmblemRefused } from "./emblem-refused";

export interface EmblemDiceBearProps {
	readonly style: string;
	readonly seed?: unknown;
	readonly options?: DiceBearOptions | undefined;
	readonly className?: string | undefined;
}

export function EmblemDiceBear({ style, seed, options, className: cls }: EmblemDiceBearProps): ReactElement {
	const { setStatus } = useContext(EMBLEM_STATUS);
	const verdict = diceBearVerdict(style);
	useRefusedEmblem(verdict.refusal, setStatus);
	if (verdict.refusal !== undefined) return <EmblemRefused reason={verdict.refusal} className={cls} />;
	return <EmblemImage src={diceBearUrl(style, seed, options)} title={verdict.credit} className={cls} />;
}
