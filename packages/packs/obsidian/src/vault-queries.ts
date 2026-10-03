import { canOf } from "@widgetarium/core/gateway/create.js";
import type {
	CanResult,
	CollectionGateway,
	Query,
	RecordRef,
	Row,
	RowsResult,
	ValueGateway,
} from "@widgetarium/core/gateway/contract.js";
import { ICrudGateway, IValueGateway } from "@widgetarium/core/gateway/declared.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { noteFieldOf } from "@widgetarium/core/gateway/obsidian.js";
import { callVerbOf, verbOf } from "@widgetarium/core/gateway/verbs-of.js";
import { textIn } from "@widgetarium/core/engine/held-text.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import type { PropPort, QueryPorts } from "@widgetarium/core/engine/packs.js";
import { fileGateway } from "./file-gateway.js";
import { folderRows } from "./folder-rows.js";

const VAULT_WRITES: readonly string[] = ["create", "update", "remove"];

export class FileQuery extends IValueGateway {
	private readonly note: ValueGateway<unknown, EveryValueVerb>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		const part = { field: noteFieldOf(ports.prop, fields), type: ports.prop.type };
		this.note = fileGateway({
			host: ports.notes,
			path: textIn(fields.path),
			part,
			requested: writableInVault(ports.prop),
		});
	}

	get(): Promise<unknown> {
		return this.note.get();
	}

	update(content: unknown): Promise<unknown> {
		return this.note.update(content);
	}

	can(verb: string): CanResult {
		return canOf(verbOf(this.note, verb));
	}

	override subscribe(changed: () => void): () => void {
		return this.note.subscribe(() => changed());
	}
}

export class FolderQuery extends ICrudGateway {
	private readonly rows: CollectionGateway<unknown>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		this.rows = folderRows({
			notes: ports.notes,
			refs: ports.refs,
			fields,
			declared: ports.prop,
			requested: writableInVault(ports.prop),
		});
	}

	list(query?: Query): Promise<RowsResult<unknown>> {
		return this.rows.list(query);
	}

	get(ref: RecordRef): Promise<Row<unknown> | null> {
		return this.rows.get(ref);
	}

	create(draft: unknown): unknown {
		return callVerbOf(this.rows, "create", draft);
	}

	update(patch: unknown): unknown {
		return callVerbOf(this.rows, "update", patch);
	}

	remove(ref: unknown): unknown {
		return callVerbOf(this.rows, "remove", ref);
	}

	repairIds(): unknown {
		return callVerbOf(this.rows, "repairIds");
	}

	describe(): unknown {
		return callVerbOf(this.rows, "describe");
	}

	can(verb: string): CanResult {
		return canOf(verbOf(this.rows, verb));
	}

	override subscribe(changed: () => void): () => void {
		return this.rows.subscribe(() => changed());
	}
}

function writableInVault(prop: PropPort): readonly string[] {
	return [...new Set([...prop.writes, ...VAULT_WRITES])];
}
