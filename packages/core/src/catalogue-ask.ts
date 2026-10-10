import { useContext, useEffect, useRef } from "react";
import { CATALOGUE_REQUESTS } from "./engine/catalogue-requests.js";
import type { CatalogueAsk as Asked } from "./engine/catalogue-requests.js";
import { CatalogueAsker } from "./engine/catalogue-asker.js";

export interface CatalogueAskProps {
	readonly asked: Asked;
	readonly onAnswer: (widget: string | null) => void;
}

export function CatalogueAsk({ asked, onAnswer }: CatalogueAskProps): null {
	const answerRef = useRef(onAnswer);
	answerRef.current = onAnswer;
	const askerRef = useContext(CatalogueAsker);
	useEffect(() => {
		let isLive = true;
		const answered = CATALOGUE_REQUESTS.ask({ ...asked, asker: askerRef.current });
		const id = CATALOGUE_REQUESTS.current()?.id ?? -1;
		void answered.then((widget) => {
			if (isLive) answerRef.current(widget);
		});
		return () => {
			isLive = false;
			CATALOGUE_REQUESTS.dismiss(id);
		};
	}, []);
	return null;
}
