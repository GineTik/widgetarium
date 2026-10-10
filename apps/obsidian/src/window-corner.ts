import { Platform } from "obsidian";
import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { cornerBoardOf, cornerWidthOf } from "./corner-board.js";
import type { CornerSide, Platform as CornerPlatform } from "./corner-board.js";
import type { Drawing } from "./design-canvas-shapes.js";

export interface WindowCornerProps extends Drawing {
	readonly side: CornerSide;
	readonly app: string;
}

export function WindowCorner(props: WindowCornerProps): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	useCornerBoardIn(node, props);
	return h("div", {
		ref: node,
		className: `wg-window-corner is-${props.side}`,
		style: { width: cornerWidthOf(props.side, platformOf()) },
	});
}

function useCornerBoardIn(
	node: RefObject<HTMLDivElement | null>,
	{ side, app, registry, host }: WindowCornerProps,
): void {
	useEffect(() => {
		const held = node.current;
		if (!held) return;
		const props = {
			board: normalizeBoard(cornerBoardOf(side, app, platformOf())),
			boardNode: held,
			registry,
			host,
			editing: false,
			isReadOnly: true,
			onChange: () => undefined,
		};
		render(h(WidgetSurface, props), held);
		return () => render(null, held);
	}, [node, side, app, registry, host]);
}

function platformOf(): CornerPlatform {
	if (Platform.isMacOS) return "macos";
	if (Platform.isWin) return "windows";
	return "web";
}
