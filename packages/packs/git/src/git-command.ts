import type { z } from "zod";
import type { ImplementationPorts, PackCommandClass } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import type { CommandContract } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import type { RepositoryFields } from "./schemas.js";

export interface GitCommand<S extends z.ZodType> extends CommandContract<z.output<S>> {
	readonly fields: RepositoryFields;
	readonly ports: ImplementationPorts;
	run(sent: z.output<S>): Promise<void>;
}

export function gitCommand<const S extends z.ZodType>(
	input: S,
	argsOf: (sent: z.output<S>) => readonly string[],
): PackCommandClass<S, RepositoryFields, GitCommand<S>> {
	return class extends ICommand.input(input) {
		constructor(
			readonly fields: RepositoryFields,
			readonly ports: ImplementationPorts,
		) {
			super();
		}

		async run(sent: z.output<S>): Promise<void> {
			await gitIn(this.ports, this.fields)(argsOf(sent));
		}
	};
}
