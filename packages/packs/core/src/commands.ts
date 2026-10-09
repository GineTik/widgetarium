import { z } from "zod";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { CanResult } from "@widgetarium/core/gateway/contract.js";
import { call, cannot, canOnTarget, targetedCommand, writeOnTarget } from "./targeted-command.js";
import type { TargetFields, Verbs } from "./targeted-command.js";

const RowSchema = z.looseObject({});
const RefSchema = z.looseObject({ ref: z.string() });
const CreatedRowSchema = z.object({ ref: z.string() }).nullable();

type CreatedRow = z.output<typeof CreatedRowSchema>;

export class ConsoleLogCommand extends ICommand.input(z.unknown()) {
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

export class RowsCreateCommand extends ICommand.input(RowSchema).output(CreatedRowSchema) {
	constructor(
		readonly fields: TargetFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	can(): CanResult {
		return canOnTarget(this.fields, this.ports, "create");
	}

	async run(sent: z.output<typeof RowSchema>): Promise<CreatedRow> {
		return createdRowOf(await writeOnTarget(this.fields, this.ports, "create", (verbs) => createRow(verbs, sent)));
	}
}

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
	const [existing]: readonly unknown[] = isObject(listed) && Array.isArray(listed["rows"]) ? listed["rows"] : [];
	return existing ?? call(verbs, "create", input);
}

function createdRowOf(written: unknown): CreatedRow {
	return isObject(written) && typeof written["ref"] === "string" ? { ref: written["ref"] } : null;
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
