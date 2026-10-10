import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { CatalogueRequest, CatalogueRequests } from "@widgetarium/core/engine/catalogue-requests.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";

const MOUNTED_FRAMES = new Set<HTMLElement>();

export function studioFrameOf({ asker }: Pick<CatalogueRequest, "asker">): HTMLElement | null {
	const shown = [...MOUNTED_FRAMES].filter(isOnScreen);
	if (asker === null) return shown[0] ?? null;
	return shown.find((frame) => frame.contains(asker)) ?? null;
}

export function useTakesCatalogueAsks(
	frame: RefObject<HTMLElement | null>,
	requests: CatalogueRequests,
	state: StudioState,
): number | null {
	const [taken, setTaken] = useState<number | null>(null);
	useEffect(() => {
		const node = frame.current;
		if (!node) return undefined;
		MOUNTED_FRAMES.add(node);
		const stopListening = requests.onAsked((request) => {
			if (studioFrameOf(request) !== node) return;
			setTaken(request.id);
			state.openPanel("catalogue");
		});
		return () => {
			MOUNTED_FRAMES.delete(node);
			stopListening();
		};
	}, [frame, requests, state]);
	return taken;
}

function isOnScreen(node: HTMLElement): boolean {
	return node.isConnected && node.getClientRects().length > 0;
}
