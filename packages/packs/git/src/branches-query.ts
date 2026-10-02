import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { BRANCH_FORMAT, branchesIn } from "./parse-refs.js";
import { pageOf } from "./page.js";
import { BranchSchema, RepositoryFieldsSchema } from "./schemas.js";
import type { Branch } from "./schemas.js";

export const BranchesFieldsSchema = RepositoryFieldsSchema.extend({ isRemoteIncluded: z.boolean().optional() });

export type BranchesFields = z.infer<typeof BranchesFieldsSchema>;

export class BranchesQuery extends IQuery.returns(z.array(BranchSchema)) {
	constructor(
		private readonly fields: BranchesFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<Branch>> {
		const refs = this.fields.isRemoteIncluded ? ["refs/heads", "refs/remotes"] : ["refs/heads"];
		const output = await gitIn(this.ports, this.fields)(["for-each-ref", BRANCH_FORMAT, ...refs]);
		return pageOf(
			branchesIn(output).map((branch) => rowOf<Branch>(branch, branch.name)),
			query,
		);
	}
}
