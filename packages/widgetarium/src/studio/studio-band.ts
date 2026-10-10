import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { bandBoardOf } from "./band-board.js";

export interface StudioBandProps {
	readonly app: string;
	readonly registry: ModuleRegistry;
	readonly host: SurfaceHost;
	readonly studio: StudioHostPort;
	readonly state: StudioState;
}

export function StudioBand({ app, registry, host, studio, state }: StudioBandProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(bandBoardOf(app)));
	const studioHost = useMemo(() => ({ ...host, studio, studioState: state }), [host, studio, state]);
	return h(
		"header",
		{ className: "wg-studio-band" },
		h(WidgetSurface, { board, registry, host: studioHost, editing: false, isReadOnly: true, onChange: setBoard }),
	);
}
