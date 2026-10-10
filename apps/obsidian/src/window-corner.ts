import { Platform } from "obsidian";
import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from "react";
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
	readonly isInCanvas: boolean;
}

const MAC_BUTTONS = { width: 80, height: 40 } as const;
const WINDOWS_BUTTONS = { width: 140, height: 40 } as const;
const FRAMELESS_CLASS = "is-hidden-frameless";

export function WindowCorner(props: WindowCornerProps): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	const platform = useSystemButtonsOver(node, props.side);
	useCornerBoardIn(node, props, platform);
	return h("div", {
		ref: node,
		className: `wg-window-corner is-${props.side}`,
		style: { width: cornerWidthOf(props.side, platform) },
	});
}

function useSystemButtonsOver(node: RefObject<HTMLDivElement | null>, side: CornerSide): CornerPlatform {
	const [platform, setPlatform] = useState<CornerPlatform>("web");
	useLayoutEffect(() => {
		const held = node.current;
		if (!held) return;
		const measure = (): void => setPlatform(systemButtonsOver(held, side));
		const watching = new ResizeObserver(measure);
		watching.observe(held.ownerDocument.body);
		const leaf = held.closest(".workspace-leaf");
		if (leaf) watching.observe(leaf);
		measure();
		return () => watching.disconnect();
	}, [node, side]);
	return platform;
}

function systemButtonsOver(node: HTMLElement, side: CornerSide): CornerPlatform {
	const box = node.getBoundingClientRect();
	const isFrameless = node.ownerDocument.body.classList.contains(FRAMELESS_CLASS);
	if (
		Platform.isMacOS &&
		side === "left" &&
		isFrameless &&
		box.left < MAC_BUTTONS.width &&
		box.top < MAC_BUTTONS.height
	)
		return "macos";
	const windowRight = node.ownerDocument.defaultView?.innerWidth ?? Number.POSITIVE_INFINITY;
	const isUnderCaption = box.right > windowRight - WINDOWS_BUTTONS.width && box.top < WINDOWS_BUTTONS.height;
	if (Platform.isWin && side === "right" && isUnderCaption) return "windows";
	return "web";
}

function useCornerBoardIn(
	node: RefObject<HTMLDivElement | null>,
	{ side, app, isInCanvas, registry, host }: WindowCornerProps,
	platform: CornerPlatform,
): void {
	useEffect(() => {
		const held = node.current;
		if (!held) return;
		const props = {
			board: normalizeBoard(cornerBoardOf({ side, app, platform, isInCanvas })),
			boardNode: held,
			registry,
			host,
			editing: false,
			isReadOnly: true,
			onChange: () => undefined,
		};
		render(h(WidgetSurface, props), held);
		return () => render(null, held);
	}, [node, side, app, platform, isInCanvas, registry, host]);
}
