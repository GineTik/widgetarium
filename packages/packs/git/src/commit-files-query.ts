import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { committedChangesIn, lineCountsIn } from "./parse-changes.js";
import { pageOf } from "./page.js";
import { FileChangeSchema, RepositoryFieldsSchema } from "./schemas.js";
import type { FileChange } from "./schemas.js";

export const CommitFilesFieldsSchema = RepositoryFieldsSchema.extend({ sha: z.string().optional() });

export type CommitFilesFields = z.infer<typeof CommitFilesFieldsSchema>;

export class CommitFilesQuery extends IQuery.returns(z.array(FileChangeSchema)) {
	constructor(
		private readonly fields: CommitFilesFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		const sha = this.fields.sha ?? "";
		return isRef(sha) ? this.ports.refs.watch([sha], changed) : () => {};
	}

	async list(query?: Query): Promise<RowsResult<FileChange>> {
		const sha = await this.shaNow();
		if (!sha) return { rows: [], total: 0 };
		const git = gitIn(this.ports, this.fields);
		const [names, counts] = await Promise.all([
			git(["show", "--name-status", "-M", "--format=", sha]),
			git(["show", "--numstat", "-M", "--format=", sha]),
		]);
		const changes = committedChangesIn(names, lineCountsIn(counts));
		return pageOf(
			changes.map((change) => rowOf<FileChange>(change, change.filePath)),
			query,
		);
	}

	private async shaNow(): Promise<string> {
		const named = this.fields.sha?.trim() ?? "";
		if (!isRef(named)) return named;
		const held = await this.ports.refs.read(named);
		if (typeof held === "string") return held;
		const sha = typeof held === "object" && held !== null ? Reflect.get(held, "sha") : undefined;
		return typeof sha === "string" ? sha : "";
	}
}

function isRef(named: string): boolean {
	return named.includes("/");
}
