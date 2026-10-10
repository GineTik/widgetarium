import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { NoFields, PanelFields } from "./studio-fields.js";

export class IsInCanvasQuery extends IQuery.output(z.boolean()) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<boolean> {
		return this.ports.studioState.now().view === "canvas";
	}

	override subscribe(changed: () => void): () => void {
		return this.ports.studioState.subscribe(changed);
	}
}

export class IsPanelOpenQuery extends IQuery.output(z.boolean()) {
	constructor(
		readonly fields: PanelFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<boolean> {
		return this.ports.studioState.now().panel === this.fields.panel;
	}

	override subscribe(changed: () => void): () => void {
		return this.ports.studioState.subscribe(changed);
	}
}
