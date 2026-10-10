import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { browserHostOf } from "../app/browser-host.js";
import type { BrowserRouter } from "../app/browser-router.js";
import { bandBoardOf } from "./band-board.js";

export interface StudioBandProps {
	readonly app: string;
	readonly registry: ModuleRegistry;
	readonly router: BrowserRouter;
	readonly studio: StudioHostPort;
	readonly pathname: string;
}

export function StudioBand({ app, registry, router, studio, pathname }: StudioBandProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(bandBoardOf(app)));
	const host = useMemo(() => ({ ...browserHostOf(router, pathname), studio }), [router, pathname, studio]);
	return h(
		"header",
		{ className: "wg-studio-band" },
		h(WidgetSurface, { board, registry, host, editing: false, isReadOnly: true, onChange: setBoard }),
	);
}
