import type { Fields } from "./catalogue-index.js";
import type { SlotFit } from "../fit.js";

export type CatalogueMode = "browse" | "place" | "fill" | "text" | "mount" | "template";

export type CatalogueKind = "board" | "inline";

export type RankEntry = (manifest: Fields) => SlotFit | null | undefined;

export interface CatalogueRequest {
	readonly id: number;
	readonly mode: CatalogueMode;
	readonly kind: CatalogueKind;
	readonly rank: RankEntry | null;
}

export interface CatalogueAsk {
	readonly mode: CatalogueMode;
	readonly kind?: CatalogueKind | undefined;
	readonly rank?: RankEntry | null | undefined;
}

export interface CatalogueRequests {
	current(): CatalogueRequest | null;
	ask(asked: CatalogueAsk): Promise<string | null>;
	answer(widget: string | null): boolean;
	dismiss(id: number): boolean;
	subscribe(listener: () => void): () => void;
	onAsked(reveal: () => void): () => void;
}

const REQUEST_TRANSITION_LOG = "[widgetarium] catalogue request: {was} → {now} ({why})";

export function createCatalogueRequests(): CatalogueRequests {
	return new CatalogueRequestStore();
}

interface PendingRequest {
	readonly request: CatalogueRequest;
	readonly settle: (widget: string | null) => void;
}

class CatalogueRequestStore implements CatalogueRequests {
	private pending: PendingRequest | null = null;
	private lastRequestId = 0;
	private readonly listeners = new Set<() => void>();
	private readonly revealers = new Set<() => void>();

	readonly current = (): CatalogueRequest | null => this.pending?.request ?? null;

	readonly ask = ({ mode, kind = "board", rank = null }: CatalogueAsk): Promise<string | null> =>
		new Promise((settle) => {
			this.pending?.settle(null);
			this.lastRequestId += 1;
			this.write({ request: { id: this.lastRequestId, mode, kind, rank }, settle }, "asked");
			for (const reveal of [...this.revealers]) reveal();
		});

	readonly answer = (widget: string | null): boolean => {
		if (!this.pending) return false;
		this.settleWith(widget, widget ? `picked ${widget}` : "dismissed");
		return true;
	};

	readonly dismiss = (id: number): boolean => {
		if (this.pending?.request.id !== id) return false;
		this.settleWith(null, "dismissed by its asker");
		return true;
	};

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	readonly onAsked = (reveal: () => void): (() => void) => {
		this.revealers.add(reveal);
		return () => this.revealers.delete(reveal);
	};

	private settleWith(widget: string | null, why: string): void {
		const settle = this.pending?.settle;
		this.write(null, why);
		settle?.(widget);
	}

	private write(next: PendingRequest | null, why: string): void {
		console.debug(
			REQUEST_TRANSITION_LOG.replace("{was}", this.pending?.request.mode ?? "none")
				.replace("{now}", next?.request.mode ?? "none")
				.replace("{why}", why),
		);
		this.pending = next;
		for (const listener of [...this.listeners]) listener();
	}
}

export const CATALOGUE_REQUESTS: CatalogueRequests = createCatalogueRequests();
