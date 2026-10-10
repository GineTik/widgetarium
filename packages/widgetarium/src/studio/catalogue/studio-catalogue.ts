import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { CatalogueBoard } from "./catalogue-board.js";
import type { CatalogueBoardName } from "./catalogue-boards.js";
import { useDismissesAskOnClose } from "./use-dismisses-ask-on-close.js";

export interface StudioCatalogueProps {
	readonly port: CataloguePort;
	readonly host: SurfaceHost;
	readonly openedBy: number | null;
}

export function StudioCatalogue({ port, host, openedBy }: StudioCatalogueProps): ReactElement {
	const [shown, setShown] = useState<CatalogueBoardName>("catalogue");
	const switchingInPlace = useMemo(() => ({ ...port, openView: setShown }), [port]);
	useDismissesAskOnClose(port.requests, openedBy);
	return h(
		"div",
		{ className: "wg-studio-catalogue-host" },
		h(CatalogueBoard, { key: shown, name: shown, port: switchingInPlace, host }),
	);
}
