import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { lineCountsIn, statusIn } from "./parse-changes.js";
import { pageOf } from "./page.js";
import { FileChangeSchema } from "./schemas.js";
import type { FileChange, RepositoryFields } from "./schemas.js";

export class StatusQuery extends IQuery.returns(z.array(FileChangeSchema)) {
	constructor(
		private readonly fields: RepositoryFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<FileChange>> {
		const git = gitIn(this.ports, this.fields);
		const [status, unstaged, staged] = await Promise.all([
			git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
			git(["diff", "--numstat"]),
			git(["diff", "--cached", "--numstat"]),
		]);
		const changes = statusIn(status, lineCountsIn(unstaged, staged));
		return pageOf(
			changes.map((change) => rowOf<FileChange>(change, change.filePath)),
			query,
		);
	}
}
