import { createElement as h, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CataloguePort } from "@widgetarium/core/engine/catalogue-port.js";
import { ModuleRegistry } from "@widgetarium/core/engine/module-registry.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import type { SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import { CATALOGUE_BOARDS } from "./catalogue-boards.js";
import type { CatalogueBoardName } from "./catalogue-boards.js";
import { CATALOGUE_WIDGETS } from "./catalogue-widgets.js";

export interface CatalogueBoardProps {
	readonly name: CatalogueBoardName;
	readonly port: CataloguePort;
	readonly host: SurfaceHost;
	readonly boardNode?: Element | null | undefined;
}

const CATALOGUE_REGISTRY = new ModuleRegistry(CATALOGUE_WIDGETS);

export function CatalogueBoard({ name, port, host, boardNode }: CatalogueBoardProps): ReactNode {
	const [board, setBoard] = useState(() => normalizeBoard(CATALOGUE_BOARDS[name]));
	const width = useRef(0);
	const catalogueHost = useMemo(() => ({ ...host, catalogue: port }), [host, port]);
	return h(WidgetSurface, {
		board,
		boardNode,
		registry: CATALOGUE_REGISTRY,
		host: catalogueHost,
		editing: false,
		isReadOnly: true,
		screen: true,
		initialWidth: width.current,
		onWidth: (drawnWidth) => {
			width.current = drawnWidth;
		},
		onChange: setBoard,
	});
}
