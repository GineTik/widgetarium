import { useEffect } from "react";
import type { CatalogueRequests } from "@widgetarium/core/engine/catalogue-requests.js";

export function useDismissesAskOnClose(requests: CatalogueRequests, openedBy: number | null): void {
	useEffect(() => {
		if (openedBy === null) return undefined;
		return () => void requests.dismiss(openedBy);
	}, [requests, openedBy]);
}
