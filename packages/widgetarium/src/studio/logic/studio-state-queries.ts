import { z } from "zod";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { STUDIO_STATE } from "../studio-state.js";
import type { NoFields, PanelFields } from "./studio-fields.js";

export class IsInCanvasQuery extends IQuery.output(z.boolean()) {
	constructor(readonly fields: NoFields) {
		super();
	}

	async get(): Promise<boolean> {
		return STUDIO_STATE.now().view === "canvas";
	}

	override subscribe(changed: () => void): () => void {
		return STUDIO_STATE.subscribe(changed);
	}
}

export class IsPanelOpenQuery extends IQuery.output(z.boolean()) {
	constructor(readonly fields: PanelFields) {
		super();
	}

	async get(): Promise<boolean> {
		return STUDIO_STATE.now().panel === this.fields.panel;
	}

	override subscribe(changed: () => void): () => void {
		return STUDIO_STATE.subscribe(changed);
	}
}
