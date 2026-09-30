import { openKeyOf, togglesUnder } from "../tree.js";
import type { LaidRegion } from "../tree-laid.js";
import type { Toggle } from "../tree-collapse.js";
import type { PressAt } from "../drawer.js";
import { dockedAction, floatingAction, nestedAction, triggerPoint } from "./box-actions.js";
import type { BoxAction, BoxActionChrome } from "./box-actions.js";
import type { PressAtKey } from "./collapsed-panel.js";
import { layTree } from "./lay-tree.js";
import type { LaidTree } from "./lay-tree.js";
import type { RegionChrome } from "./region-chrome.js";
import { sidebarGrip } from "./sidebar-drag.js";
import type { TreeBoardProps } from "./tree-board.js";
import { regionsOf } from "./tree-regions.js";
import type { PlacedOf } from "./tree-regions.js";
import { useHeaderActions } from "./use-header-actions.js";
import { useOpenKeys } from "./use-open-keys.js";
import type { SurfaceShared } from "./use-surface-shared.js";
import type { TreePage } from "./use-tree-page.js";

type ToggleOpen = (openKey: string, point?: PressAt | null) => Promise<unknown>;

export interface TreeChrome extends LaidTree, BoxActionChrome, RegionChrome {
	readonly shared: SurfaceShared;
	readonly pressAt: PressAtKey;
	readonly toggleOpen: ToggleOpen;
}

export function useTreeChrome(props: TreeBoardProps, page: TreePage): TreeChrome {
	const { width, shared, commitLayout, onActions } = props;
	const laid = layTree(props, page);
	const pressAt: PressAtKey = (openKey) => page.pressedRef.current.get(openKey) ?? triggerPoint(openKey);
	const { placedOf, region } = regionsOf({ ...props, pressAt }, page, laid);
	const toggles = standingOf(laid, placedOf, width).flatMap((placed) => togglesUnder(placed.node));
	const open = useOpenKeys(openableOf(laid, toggles), shared.cellFor);
	const chrome: TreeChrome = {
		...laid,
		shared,
		region,
		commitLayout,
		pressAt,
		open,
		grabSidebar: sidebarGrip(props, page, laid.root),
		toggleOpen: openToggler(page, shared),
	};
	useHeaderActions(headerActionsOf(chrome, toggles), onActions);
	return chrome;
}

function standingOf(laid: LaidTree, placedOf: PlacedOf, width: number): LaidRegion[] {
	return [
		...laid.beside.map((column) => placedOf(column.at, column.width, false)),
		...laid.alone.map((at) => placedOf(at, width, false)),
	];
}

function openableOf(laid: LaidTree, toggles: readonly Toggle[]): string[] {
	return [
		...laid.floating.flatMap((at) => {
			const node = laid.drawn.of[at];
			return node ? [openKeyOf(node, [at])] : [];
		}),
		...toggles.flatMap((toggle) => (toggle.kind === "collapsed" ? [toggle.openKey] : [])),
	];
}

function openToggler({ pressedRef }: Pick<TreePage, "pressedRef">, shared: Pick<SurfaceShared, "cellFor">): ToggleOpen {
	return (openKey, point) => {
		pressedRef.current.set(openKey, point);
		const cell = shared.cellFor(openKey);
		return Promise.resolve(cell.get()).then((isOpen) => cell.update(isOpen !== true));
	};
}

function headerActionsOf(chrome: TreeChrome, toggles: readonly Toggle[]): BoxAction[] {
	return [
		...chrome.drawn.of.map((_child, at) =>
			chrome.floating.includes(at) ? floatingAction(at, chrome) : dockedAction(at, chrome),
		),
		...toggles.map((toggle) => nestedAction(toggle, chrome)),
	].filter((action): action is BoxAction => Boolean(action));
}
