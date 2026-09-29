import { openKeyOf, togglesUnder } from "../tree.js";
import { dockedAction, floatingAction, nestedAction, triggerPoint } from "./box-actions.js";
import { laidTree } from "./laid-tree.js";
import { sidebarGrip } from "./sidebar-drag.js";
import { regionsOf } from "./tree-regions.js";
import { useHeaderActions } from "./use-header-actions.js";
import { useOpenKeys } from "./use-open-keys.js";

export function useTreeChrome(props, page) {
	const { width, shared, commitLayout, onActions } = props;
	const laid = laidTree(props, page);
	const pressAt = (openKey) => page.pressedRef.current.get(openKey) ?? triggerPoint(openKey);
	const { placedOf, region } = regionsOf({ ...props, pressAt }, page, laid);
	const toggles = standingOf(laid, placedOf, width).flatMap((placed) => togglesUnder(placed.node));
	const open = useOpenKeys(openableOf(laid, toggles), shared.cellFor);
	const chrome = {
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

function standingOf(laid, placedOf, width) {
	return [
		...laid.beside.map((column) => placedOf(column.at, column.width, false)),
		...laid.alone.map((at) => placedOf(at, width, false)),
	];
}

function openableOf(laid, toggles) {
	return [
		...laid.floating.map((at) => openKeyOf(laid.drawn.of[at], [at])),
		...toggles.filter((toggle) => toggle.kind === "collapsed").map((toggle) => toggle.openKey),
	];
}

function openToggler({ pressedRef }, shared) {
	return (openKey, point) => {
		pressedRef.current.set(openKey, point);
		const cell = shared.cellFor(openKey);
		return Promise.resolve(cell.get()).then((isOpen) => cell.update(isOpen !== true));
	};
}

function headerActionsOf(chrome, toggles) {
	return [
		...chrome.drawn.of.map((child, at) =>
			chrome.floating.includes(at) ? floatingAction(at, chrome) : dockedAction(at, chrome),
		),
		...toggles.map((toggle) => nestedAction(toggle, chrome)),
	].filter(Boolean);
}
