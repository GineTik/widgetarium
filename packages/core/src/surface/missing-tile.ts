import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, ProgressRing } from "@widgetarium/kit";
import { generationOf, widgetKeyOf } from "../engine/widget-ref.js";
import { useInstallJob } from "../engine/install-jobs.js";
import type { InstallJob } from "../engine/install-jobs.js";
import type { CataloguePort } from "../engine/catalogue-port.js";
import { isObject } from "../engine/is-object.js";
import type { Tile } from "../model.js";
import type { WidgetDefinition } from "./is-drawable.js";

const COULD_NOT_LOAD = "This widget could not be loaded";
const INSTALL_THAT_VERSION = "Install the version this board was made with";
const NOT_INSTALLED = "This widget is not installed";
const COULD_NOT_INSTALL = "This widget could not be installed";
const RETRY = "Try again";
const INSTALLING = "Installing {widget}";
const WRITING = "Writing {done} of {total} files";
const FETCHING = "Fetching";

export interface InstallingHost {
	readonly installWidgetAt?: ((widget: string) => unknown) | null;
	readonly catalogue?: CataloguePort | undefined;
}

interface MissingTileProps {
	readonly tile: Pick<Tile, "widget">;
	readonly host: InstallingHost | null | undefined;
}

export function failedTile(tile: Pick<Tile, "widget">, definition: WidgetDefinition): ReactElement {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, COULD_NOT_LOAD),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		h("span", { key: "why" }, String(errorMessageOf(definition.error) ?? definition.error ?? "")),
	]);
}

export function missingTile(tile: Pick<Tile, "widget">, host: InstallingHost | null | undefined): ReactElement {
	return h(MissingTile, { tile, host });
}

function MissingTile({ tile, host }: MissingTileProps): ReactElement {
	const key = widgetKeyOf(tile.widget);
	const job = useInstallJob(key);
	if (job && job.state !== "failed") return installingTile(tile.widget, job);
	const install = host?.installWidgetAt;
	const retry = host?.catalogue?.install;
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, job ? COULD_NOT_INSTALL : NOT_INSTALLED),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		job?.failure ? h("p", { key: "why", className: "wg-missing-why" }, job.failure) : null,
		job && retry
			? h(Button, { key: "retry", size: "s", className: "wg-missing-install", onClick: () => void retry(key) }, RETRY)
			: null,
		!job && generationOf(tile.widget) && install
			? h(
					Button,
					{ key: "install", size: "s", className: "wg-missing-install", onClick: () => install(tile.widget) },
					INSTALL_THAT_VERSION,
				)
			: null,
	]);
}

function installingTile(widget: string, job: InstallJob): ReactElement {
	return h("div", { className: "wg-missing is-installing", "aria-busy": "true" }, [
		h(ProgressRing, { key: "ring", done: job.done, total: job.total, label: INSTALLING.replace("{widget}", widget) }),
		h("b", { key: "said" }, INSTALLING.replace("{widget}", widget)),
		h("p", { key: "step", className: "wg-missing-id" }, stepLineOf(job)),
	]);
}

function stepLineOf(job: InstallJob): string {
	if (job.state === "writing") return WRITING.replace("{done}", String(job.done)).replace("{total}", String(job.total));
	return FETCHING;
}

function errorMessageOf(error: unknown): unknown {
	return isObject(error) ? error["message"] : undefined;
}
