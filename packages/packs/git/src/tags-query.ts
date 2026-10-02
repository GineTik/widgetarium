import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { gitIn } from "./git-run.js";
import { TAG_FORMAT, tagsIn } from "./parse-refs.js";
import { pageOf } from "./page.js";
import { TagSchema } from "./schemas.js";
import type { RepositoryFields, Tag } from "./schemas.js";

export class TagsQuery extends IQuery.returns(z.array(TagSchema)) {
	constructor(
		private readonly fields: RepositoryFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async list(query?: Query): Promise<RowsResult<Tag>> {
		const output = await gitIn(
			this.ports,
			this.fields,
		)(["for-each-ref", TAG_FORMAT, "--sort=-creatordate", "refs/tags"]);
		return pageOf(
			tagsIn(output).map((tag) => rowOf<Tag>(tag, tag.name)),
			query,
		);
	}
}
