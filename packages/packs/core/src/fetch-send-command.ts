import { z } from "zod";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { fetchJson } from "./fetch-json.js";

export const FetchSendFieldsSchema = z.object({
	url: z.string().optional(),
	method: z.string().optional(),
});

export type FetchSendFields = z.infer<typeof FetchSendFieldsSchema>;

export class FetchSendCommand extends ICommand.takes(z.unknown()) {
	constructor(
		readonly fields: FetchSendFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	async run(sent: unknown): Promise<void> {
		const method = this.fields.method?.trim().toUpperCase() || "POST";
		const body = sent === undefined ? "" : JSON.stringify(sent);
		await fetchJson(this.ports, this.fields.url, { method, body, headers: { "content-type": "application/json" } });
	}
}
