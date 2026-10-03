import type { MergedEntry } from "../catalogue-entries.js";
import type { Template } from "../templates.js";
import { CATALOGUE_REQUESTS } from "./catalogue-requests.js";
import type { CatalogueKind, CatalogueRequests } from "./catalogue-requests.js";
import { INSTALL_JOBS } from "./install-jobs.js";
import type { InstallJobs, InstallOutcome } from "./install-jobs.js";
import type { PreviewRegistry } from "../preview.js";
import type { ShotHost } from "./shot.js";
import type { PlaceAt, ViewHost } from "../gateway/host.js";

export type CatalogueViewName = "catalogue" | "docs";

export interface CataloguePort {
	readonly can: boolean;
	entries(kind: CatalogueKind): Promise<readonly MergedEntry[]>;
	entryOf(widget: string): MergedEntry | null;
	templates(): readonly Template[];
	install(widget: string): Promise<InstallOutcome>;
	uninstall(widget: string): Promise<InstallOutcome>;
	applyTemplate(template: string): Promise<InstallOutcome>;
	place(widget: string, at: PlaceAt): boolean;
	openView(view: CatalogueViewName): void;
	subscribe(changed: () => void): () => void;
	readonly jobs: InstallJobs;
	readonly requests: CatalogueRequests;
	readonly previewRegistry: PreviewRegistry | null;
	readonly previewHost: (ViewHost & ShotHost) | null;
}

const NO_CATALOGUE_MESSAGE = "no widget catalogue on this host";

export const NO_CATALOGUE_PORT: CataloguePort = {
	can: false,
	entries: async () => [],
	entryOf: () => null,
	templates: () => [],
	install: async () => ({ ok: false, failure: NO_CATALOGUE_MESSAGE }),
	uninstall: async () => ({ ok: false, failure: NO_CATALOGUE_MESSAGE }),
	applyTemplate: async () => ({ ok: false, failure: NO_CATALOGUE_MESSAGE }),
	openView: () => console.warn(`Widgetarium: ${NO_CATALOGUE_MESSAGE}`),
	place: () => false,
	subscribe: () => () => undefined,
	jobs: INSTALL_JOBS,
	requests: CATALOGUE_REQUESTS,
	previewRegistry: null,
	previewHost: null,
};
