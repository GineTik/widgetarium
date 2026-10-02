import type { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import type { RepositoryFields } from "./schemas.js";

export function gitCommand<const S extends z.ZodType>(input: S, argsOf: (sent: z.output<S>) => readonly string[]) {
	return class extends ICommand.takes(input) {
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
