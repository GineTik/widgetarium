import { MarkdownRenderChild, parseYaml } from "obsidian";
import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { readAppPointer } from "@widgetarium/core/project/app-pointer.js";
import { render } from "@widgetarium/core/engine/render.js";
import { withPageParams } from "@widgetarium/core/engine/page-params.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { matchProjectRoute } from "@widgetarium/core/project/index.js";
import type { OpenedRoute } from "@widgetarium/core/project/open-project.js";
import type { BoardRegistry, SurfaceHost } from "@widgetarium/core/surface/use-surface-shared.js";
import type { MountContext } from "./board-mount.js";
import type { AppOpening, AppProjects } from "./app-projects.js";
import { refusalOf, reportNotDrawn, reportRefused } from "./app-refusal.js";

export const APP_BLOCK_LANGUAGE = "widgetarium-app";

export interface AppBlockPlace {
	readonly projects: AppProjects;
	hostOf(notePath: string): SurfaceHost;
}

interface AppBlock {
	readonly folder: string;
	readonly route: string;
}

interface PlacedBlock {
	readonly block: AppBlock;
	readonly host: SurfaceHost;
	readonly node: HTMLElement;
}

interface BlockView extends PlacedBlock {
	isCurrent(): boolean;
}

interface BlockNode {
	readonly node: HTMLElement;
	readonly closers: (() => void)[];
}

interface RouteBoardProps {
	readonly board: unknown;
	readonly registry: BoardRegistry;
	readonly host: SurfaceHost;
	readonly boardNode: HTMLElement;
}

const BLOCK_UNREADABLE =
	'This widgetarium-app block cannot be read: {reason}. It names a project folder and a route, such as "app: Apps/Demo" and "route: /tasks/42".';
const NO_SUCH_ROUTE = "The app at {folder} has no route answering {route}. Its routes: {routes}.";
const NO_ROUTES = "none";
const QUERY_OR_HASH = /[?#].*$/;

export function drawAppBlock(place: AppBlockPlace, source: string, element: HTMLElement, context: MountContext): void {
	const { node, closers } = blockNodeIn(element, context);
	const block = appBlockOf(source);
	if ("refusal" in block) return render(refusalOf(block.refusal), node);
	closers.push(...redrawOnEveryChange(place.projects, { block, node, host: place.hostOf(context.sourcePath) }));
}

function blockNodeIn(element: HTMLElement, context: MountContext): BlockNode {
	shieldFromEditor(element);
	const node = element.ownerDocument.createElement("div");
	node.className = "wg-app-block interactive-child";
	element.appendChild(node);
	const closers: (() => void)[] = [() => render(null, node)];
	const child = new MarkdownRenderChild(element);
	child.onunload = () => closers.forEach((close) => close());
	context.addChild(child);
	return { node, closers };
}

function redrawOnEveryChange(projects: AppProjects, placed: PlacedBlock): (() => void)[] {
	let latest = 0;
	const draw = (): void => {
		const asked = (latest += 1);
		void drawOpening({ ...placed, isCurrent: () => latest === asked }, projects.open(placed.block.folder));
	};
	const stopWatching = projects.watch(placed.block.folder, draw);
	draw();
	return [() => (latest = -1), stopWatching];
}

function appBlockOf(source: string): AppBlock | { readonly refusal: string } {
	const read = readAppPointer(yamlOrNull(source));
	if ("refusal" in read) return { refusal: BLOCK_UNREADABLE.replace("{reason}", read.refusal) };
	return { folder: read.pointer.app, route: read.pointer.route.replace(QUERY_OR_HASH, "") };
}

function yamlOrNull(source: string): unknown {
	try {
		return parseYaml(source);
	} catch {
		return null;
	}
}

async function drawOpening(view: BlockView, asked: Promise<AppOpening>): Promise<void> {
	try {
		const drawn = await drawnOpening(view, await asked);
		if (view.isCurrent()) render(drawn, view.node);
	} catch (failure) {
		const said = reportNotDrawn(view.block.folder, failure);
		if (view.isCurrent()) render(refusalOf(said), view.node);
	}
}

async function drawnOpening({ block, host, node }: BlockView, opening: AppOpening): Promise<ReactElement> {
	if (!opening.ok) return refusalOf(reportRefused(block.folder, opening.findings));
	const matched = matchProjectRoute(opening.routes, block.route);
	if (!matched) return refusalOf(missingRoute(block, opening.routes));
	// TRADE-OFF: params are kept per note, so two app blocks in one note share them
	if (host.notePath) await withPageParams(host.notePath, matched.params);
	return h(RouteBoard, {
		key: opening.version,
		board: matched.route.board,
		registry: opening.registry,
		host,
		boardNode: node,
	});
}

function RouteBoard({ board, registry, host, boardNode }: RouteBoardProps): ReactElement {
	const [drawn, setDrawn] = useState(() => routePageOf(board));
	return h(WidgetSurface, {
		board: drawn,
		registry,
		host,
		boardNode,
		editing: false,
		isReadOnly: true,
		screen: true,
		onChange: setDrawn,
	});
}

function routePageOf(board: unknown): Board {
	return { ...normalizeBoard(board), mode: "expanded" };
}

function missingRoute({ folder, route }: AppBlock, routes: readonly OpenedRoute[]): string {
	const known = routes.map(({ path }) => path).join(", ") || NO_ROUTES;
	return NO_SUCH_ROUTE.replace("{folder}", folder).replace("{route}", route).replace("{routes}", known);
}
