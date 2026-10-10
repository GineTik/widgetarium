import { createElement as h, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StudioState } from "@widgetarium/core/engine/studio-state-port.js";
import type { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { MIN_LAID_OUT_BOARD_PX } from "@widgetarium/core/surface/use-board-width.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { cornerBoardOf } from "./band-board.js";
import type { BandCorner } from "./band-board.js";

export interface StudioCornerProps {
	readonly app: string;
	readonly corner: BandCorner;
	readonly registry: ModuleRegistry;
	readonly host: SurfaceHost;
	readonly studio: StudioHostPort;
	readonly state: StudioState;
}

export function StudioCorner({ app, corner, registry, host, studio, state }: StudioCornerProps): ReactElement {
	const [board, setBoard] = useState(() => normalizeBoard(cornerBoardOf(app, corner)));
	const studioHost = useMemo(() => ({ ...host, studio, studioState: state }), [host, studio, state]);
	return h(
		"div",
		{ className: `wg-studio-corner-board is-${corner}` },
		h(WidgetSurface, {
			board,
			registry,
			host: studioHost,
			editing: false,
			isReadOnly: true,
			onChange: setBoard,
			initialWidth: MIN_LAID_OUT_BOARD_PX,
		}),
	);
}
