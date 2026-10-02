import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { BRANCH_FORMAT, branchesIn } from "./parse-refs.js";
import { BranchSchema } from "./schemas.js";
import type { Branch, RepositoryFields } from "./schemas.js";

export class CurrentBranchQuery extends IQuery.returns(BranchSchema.nullable()) {
	constructor(
		private readonly fields: RepositoryFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<Branch | null> {
		const output = await gitIn(this.ports, this.fields)(["for-each-ref", BRANCH_FORMAT, "refs/heads"]);
		return branchesIn(output).find((branch) => branch.isCurrent) ?? null;
	}
}
