import { z } from "zod";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { call, cannot, targetedCommand } from "./targeted-command.js";
import type { Verbs } from "./targeted-command.js";

const RowSchema = z.looseObject({});
const RefSchema = z.looseObject({ ref: z.string() });

export class ConsoleLogCommand extends ICommand.takes(z.unknown()) {
	constructor(
		readonly fields: object,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	run(sent: unknown): void {
		console.log(`[widgetarium] ${this.ports.self} sent`, sent);
	}
}

export class ValueSetCommand extends targetedCommand(z.unknown(), "update", (verbs, sent) =>
	call(verbs, "update", sent),
) {}

export class RowsCreateCommand extends targetedCommand(RowSchema, "create", createRow) {}

export class RowsUpdateCommand extends targetedCommand(RefSchema, "update", updateRow) {}

export class RowsRemoveCommand extends targetedCommand(z.union([RefSchema, z.string()]), "remove", removeRow) {}

export class RowsReplaceCommand extends targetedCommand(z.array(z.unknown()), "replace", (verbs, sent) =>
	call(verbs, "replace", sent),
) {}

export class RowsRepairIdsCommand extends targetedCommand(z.undefined(), "repairIds", (verbs) =>
	call(verbs, "repairIds", undefined),
) {}

async function createRow(verbs: Verbs, input: unknown): Promise<unknown> {
	const id = isObject(input) ? input["id"] : undefined;
	if (typeof id !== "string" || id === "") return call(verbs, "create", input);
	const listed: unknown = await call(verbs, "list", { where: [{ prop: "id", op: "is", value: id }], limit: 1 });
	const held = isObject(listed) && Array.isArray(listed["rows"]) ? listed["rows"].length : 0;
	return held > 0 ? null : call(verbs, "create", input);
}

function updateRow(verbs: Verbs, input: unknown): Promise<unknown> {
	if (!isObject(input) || typeof input["ref"] !== "string")
		return Promise.reject(new Error(cannot("this row", "update")));
	const { ref, ...data } = input;
	return call(verbs, "update", { ref, data });
}

function removeRow(verbs: Verbs, input: unknown): Promise<unknown> {
	const ref = isObject(input) ? input["ref"] : input;
	if (typeof ref !== "string") return Promise.reject(new Error(cannot("this row", "remove")));
	return call(verbs, "remove", ref);
}
