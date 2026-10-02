import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { linesOf } from "./parse-refs.js";
import { worktreesIn } from "./parse-worktrees.js";
import { pageOf } from "./page.js";
import { WorktreeSchema } from "./schemas.js";
import type { RepositoryFields, Worktree } from "./schemas.js";

export class WorktreesQuery extends IQuery.returns(z.array(WorktreeSchema)) {
	constructor(
		private readonly fields: RepositoryFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<Worktree>> {
		const output = await gitIn(this.ports, this.fields)(["worktree", "list", "--porcelain"]);
		const worktrees = await Promise.all(worktreesIn(output).map((worktree) => this.withChanged(worktree)));
		return pageOf(
			worktrees.map((worktree) => rowOf<Worktree>(worktree, worktree.path)),
			query,
		);
	}

	private async withChanged(worktree: Worktree): Promise<Worktree> {
		if (worktree.isPrunable) return worktree;
		const status = await gitIn(this.ports, { repository: worktree.path })(["status", "--porcelain"]);
		return { ...worktree, changed: linesOf(status).length };
	}
}
