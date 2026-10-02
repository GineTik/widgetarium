import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { FilterRow, Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { LOG_FORMAT, commitsIn } from "./parse-log.js";
import { CommitSchema, RepositoryFieldsSchema } from "./schemas.js";
import type { Commit } from "./schemas.js";

export const CommitsFieldsSchema = RepositoryFieldsSchema.extend({
	branch: z.string().optional(),
	path: z.string().optional(),
});

export type CommitsFields = z.infer<typeof CommitsFieldsSchema>;

const PAGE_UNASKED = 100;

const FILTERED_FIELDS: Readonly<Record<string, string>> = { author: "--author", subject: "--grep" };

const FILTERS_ONLY = "@git/commits filters only by author and subject, not by {field}";

export class CommitsQuery extends IQuery.returns(z.array(CommitSchema)) {
	constructor(
		private readonly fields: CommitsFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<Commit>> {
		const git = gitIn(this.ports, this.fields);
		const scope = [this.fields.branch?.trim() || "HEAD", ...pathArgs(this.fields.path)];
		const filters = (query?.where ?? []).map(filterArgOf);
		const page = [`--skip=${query?.offset ?? 0}`, "-n", String(query?.limit ?? PAGE_UNASKED)];
		const [log, counted] = await Promise.all([
			git(["log", LOG_FORMAT, "--shortstat", ...filters, ...page, ...scope]),
			git(["rev-list", "--count", ...filters, ...scope]),
		]);
		const rows = commitsIn(log).map((commit) => rowOf<Commit>(commit, commit.sha));
		return { rows, total: Number(counted.trim()) || 0 };
	}
}

function filterArgOf(row: FilterRow): string {
	const field = row.prop ?? "";
	const flag = FILTERED_FIELDS[field];
	if (!flag) throw new Error(FILTERS_ONLY.replace("{field}", field || "an unnamed field"));
	return `${flag}=${String(row.value ?? "")}`;
}

function pathArgs(path: string | undefined): string[] {
	const trimmed = path?.trim();
	return trimmed ? ["--", trimmed] : [];
}
