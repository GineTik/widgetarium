import { fileGateway, noteFieldOf } from "@widgetarium/core/gateway/obsidian.js";
import { requestedVerbs } from "@widgetarium/core/gateway/props.js";
import { textIn } from "@widgetarium/core/engine/held-text.js";
import { folderRows } from "@widgetarium/core/engine/folder-rows.js";
import { EngineBackedRows, EngineBackedValue } from "@widgetarium/core/engine/engine-backed.js";
import type {
	HostFields,
	HostGateway,
	HostSpec,
	ImplementationContext,
} from "@widgetarium/core/engine/engine-backed.js";

const VAULT_WRITES: readonly string[] = ["create", "update", "remove"];

export class FileQuery extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { spec, host } = context;
		const part = { field: noteFieldOf(spec, fields), type: spec.type };
		return fileGateway({ host, path: textIn(fields.path), part, requested: writableInVault(spec) });
	}
}

export class FolderQuery extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { spec, host, refs } = context;
		const path = textIn(fields.path);
		return folderRows({ spec, host, config: fields, refs, path, requested: writableInVault(spec) });
	}
}

function writableInVault(spec: HostSpec): readonly string[] {
	return [...new Set([...requestedVerbs(spec), ...VAULT_WRITES])];
}
