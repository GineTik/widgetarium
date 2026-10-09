import { z } from "../packages/core/src/gateway/declared.ts";
import { ICommand, IQuery } from "../packages/core/src/gateway/queries.ts";
import { definePack, registerPacks } from "../packages/core/src/engine/packs.ts";
import { defineCommandMetadata, defineGatewayMetadata } from "../packages/core/src/gateway/implementation-metadata.ts";
import { rowOf } from "../packages/core/src/gateway/create.ts";

export const StatusSchema = z.enum(["todo", "doing", "done"]);
export const TaskSchema = z.object({ title: z.string(), status: StatusSchema, id: z.string().optional() });

const PackFieldsSchema = z.object({ prefix: z.string().optional() });

type PackFields = z.output<typeof PackFieldsSchema>;

export const packMoves: unknown[] = [];
export const packStamps: unknown[] = [];

export function registerTestPack(): void {
	registerPacks(
		definePack({
			id: "@test",
			title: "Test",
			queries: [
				defineGatewayMetadata(PackTasksQuery, {
					id: "@test/tasks",
					title: "Packed tasks",
					resource: "Folder",
					fields: PackFieldsSchema,
				}),
			],
			commands: [
				defineCommandMetadata(PackMoveCommand, {
					id: "@test/move",
					title: "Packed move",
					resource: "Folder",
					description: "Records the move.",
					fields: PackFieldsSchema,
				}),
				defineCommandMetadata(PackStampCommand, {
					id: "@test/stamp",
					title: "Packed stamp",
					resource: "Git",
					description: "Answers a hash.",
					fields: PackFieldsSchema,
				}),
			],
		}),
	);
}

class PackTasksQuery extends IQuery.output(z.array(TaskSchema)) {
	constructor(readonly fields: PackFields) {
		super();
	}

	list() {
		const rows = [
			rowOf<{ title: string; status: "todo" }>({ title: `${this.fields.prefix ?? ""}Packed`, status: "todo" }, "p1"),
		];
		return { rows, total: 1 };
	}
}

class PackMoveCommand extends ICommand.input(z.object({ ref: z.string(), status: StatusSchema })) {
	constructor(readonly fields: PackFields) {
		super();
	}

	run(input: unknown): void {
		packMoves.push([this.fields.prefix, input]);
	}
}

class PackStampCommand extends ICommand.input(z.unknown()).output(z.object({ hash: z.string().min(3) })) {
	constructor(readonly fields: PackFields) {
		super();
	}

	run(): { hash: string } {
		packStamps.push(this.fields.prefix);
		return { hash: this.fields.prefix ?? "" };
	}
}
