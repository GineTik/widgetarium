import { Fragment, createElement as h, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Job } from "@widgetarium/core/app-jobs.js";
import type { CanvasDoc, DesignPort, DrawnDesign, LayerMove } from "@widgetarium/core/engine/design-port.js";
import type { Size } from "../canvas/frame-size.js";
import { CanvasTopBar, DesignCanvas } from "./design-canvas.js";
import type { DesignCanvasProps } from "./design-canvas.js";
import { COMPONENTS_PAGE, shownPageOf } from "./design-canvas-page.js";
import { TAKES_PICTURES } from "./design-drawn-when-seen.js";
import { imageFilesIn } from "./design-photos.js";
import { widgetOpenerOf } from "./design-references.js";
import type { CanvasMode } from "./design-tools.js";

export interface DesignViewState {
	readonly page: string;
	readonly isLayersOpen: boolean;
	readonly mode: CanvasMode;
}

export interface DesignStageProps {
	readonly port: DesignPort;
	readonly app: string;
	readonly view: DesignViewState;
	readonly onView: (view: DesignViewState) => void;
	readonly size: Size;
	readonly fieldOf: () => HTMLElement | null;
	readonly ownsPaste?: (() => boolean) | undefined;
}

export const DESIGN_OPENED_ON: DesignViewState = { page: "", isLayersOpen: false, mode: "hand" };

interface LoadedDesign extends DrawnDesign {
	readonly jobs: readonly Job[];
	readonly docs: readonly CanvasDoc[];
}

type StageActions = Pick<
	DesignCanvasProps,
	"controls" | "opener" | "onAddPhotos" | "onMove" | "onReturn" | "onPage" | "onLayers" | "onMode"
>;

export function DesignStage(props: DesignStageProps): ReactElement | null {
	const { port, app, view } = props;
	const [loaded, load] = useLoadedDesign(port, app);
	const [focusWidget, setFocusWidget] = useState<string | null>(null);
	const pick = usePickedVariants();
	const drawing = useMemo(() => port.drawing(), [port]);
	const { page, keptPage } = useShownPage(props, loaded);
	const actions = useStageActions(props, { page, load, onWidget: setFocusWidget, registry: drawing.registry });
	usePastedPhotos(props.ownsPaste, actions.onAddPhotos);
	const onFocusedWidget = useCallback(() => setFocusWidget(null), []);
	if (!loaded) return null;
	const flags = { isLayersOpen: view.isLayersOpen, mode: view.mode, size: props.size };
	const canvas = {
		app,
		...loaded,
		...actions,
		...flags,
		...drawing,
		pick,
		page,
		keptPage,
		focusWidget,
		onFocusedWidget,
	};
	return h(
		TAKES_PICTURES.Provider,
		{ value: port.pictureOf },
		h(Fragment, null, [
			h(DesignCanvas, { key: page, ...canvas }),
			h(CanvasTopBar, { key: "top", ...canvas, fieldOf: props.fieldOf }),
		]),
	);
}

function useLoadedDesign(port: DesignPort, app: string): readonly [LoadedDesign | null, () => void] {
	const [loaded, setLoaded] = useState<LoadedDesign | null>(null);
	const asked = useRef(0);
	const load = useCallback(() => {
		const ask = (asked.current += 1);
		loadedDesignOf(port, app).then(
			(now) => asked.current === ask && setLoaded(now),
			(failure: unknown) => console.error("[widgetarium] the canvas could not read the design", app, failure),
		);
	}, [port, app]);
	useEffect(() => {
		load();
		const stopChanges = port.onChanged(app, load);
		const stopJobs = port.onJobs(load);
		return () => {
			asked.current += 1;
			stopChanges();
			stopJobs();
		};
	}, [port, app, load]);
	return [loaded, load];
}

async function loadedDesignOf(port: DesignPort, app: string): Promise<LoadedDesign> {
	const jobs = port.jobs(app);
	const docs = await port.docs(app);
	const design = await port.design(app, jobs.length > 0 || docs.length > 0);
	return { ...design, jobs, docs };
}

function useShownPage(
	{ view, onView }: DesignStageProps,
	loaded: LoadedDesign | null,
): { readonly page: string; readonly keptPage: string } {
	const shownBefore = useRef("");
	const keptPage = shownBefore.current === view.page ? view.page : "";
	const shown = loaded ? shownPageOf(view.page, { ...loaded, keptPage }) : view.page;
	useEffect(() => {
		if (!loaded) return;
		shownBefore.current = shown;
		if (view.page === "") onView({ ...view, page: shown });
	}, [loaded, shown, view, onView]);
	return { page: view.page || shown, keptPage };
}

function usePickedVariants(): DesignCanvasProps["pick"] {
	const [variants, setVariants] = useState<Readonly<Record<string, string>>>({});
	const onVariant = useCallback(
		(page: string, screen: string) => setVariants((was) => ({ ...was, [page]: screen })),
		[],
	);
	return { variants, onVariant };
}

interface StageNeeds {
	readonly page: string;
	readonly load: () => void;
	readonly onWidget: (widget: string) => void;
	readonly registry: DesignCanvasProps["registry"];
}

function useStageActions({ port, app, view, onView }: DesignStageProps, needs: StageNeeds): StageActions {
	const { page, load, onWidget, registry } = needs;
	return useMemo(() => {
		const failed = (what: string) => (failure: unknown) => console.error(`[widgetarium] ${what}`, app, failure);
		const onPage = (next: string): void => onView({ ...view, page: next });
		const openWidget = (widget: string): void => {
			onWidget(widget);
			onPage(COMPONENTS_PAGE);
		};
		return {
			controls: {
				live: (id: string) => port.liveJob(app, id),
				stop: (id: string) => void port.stopJob(app, id).then(load, failed("the job was not stopped")),
			},
			opener: widgetOpenerOf(registry, openWidget),
			onAddPhotos: (photos: readonly File[]) =>
				void port.addPhotos(app, photos).then(load, failed("design photos were not added")),
			onMove: (widget: string, move: LayerMove) =>
				void port.moveLayer(widget, move).catch(failed("the layer was not moved")),
			onReturn: () => void port.returnToView(app, page).catch(failed("the canvas cannot return to the app")),
			onPage,
			onLayers: () => onView({ ...view, isLayersOpen: !view.isLayersOpen }),
			onMode: (mode: CanvasMode) => onView({ ...view, mode }),
		};
	}, [port, app, view, onView, page, load, onWidget, registry]);
}

function usePastedPhotos(ownsPaste: (() => boolean) | undefined, onAddPhotos: (photos: readonly File[]) => void): void {
	useEffect(() => {
		if (!ownsPaste) return undefined;
		const onPaste = (event: ClipboardEvent): void => {
			if (!ownsPaste()) return;
			const photos = imageFilesIn(event.clipboardData?.files);
			if (photos.length === 0) return;
			event.preventDefault();
			onAddPhotos(photos);
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, [ownsPaste, onAddPhotos]);
}
