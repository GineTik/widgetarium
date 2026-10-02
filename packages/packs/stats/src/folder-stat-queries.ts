import type { TileProp } from "@widgetarium/core/model.js";
import { statGateway } from "@widgetarium/core/gateway/stats.js";
import type { StatAlgorithm, StatQuery } from "@widgetarium/core/gateway/stats.js";
import { textIn } from "@widgetarium/core/engine/held-text.js";
import { folderRows } from "@widgetarium/core/engine/folder-rows.js";
import { EngineBackedValue } from "@widgetarium/core/engine/engine-backed.js";
import type { HostFields, HostGateway, ImplementationContext } from "@widgetarium/core/engine/engine-backed.js";

export class FolderStatQuery extends EngineBackedValue {
	static algorithm: string = "count";

	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		const { host, refs } = context;
		const rows = folderRows({ spec: {}, host, config: fields, refs, path: textIn(fields.path), requested: ["list"] });
		return statGateway(rows, statQueryOf(fields, this.algorithm));
	}
}

export function folderStatQueryFor(algorithm: StatAlgorithm): typeof FolderStatQuery {
	const Counted = class extends FolderStatQuery {
		static override algorithm = algorithm;
	};
	Object.defineProperty(Counted, "name", { value: `${pascalOf(algorithm)}Query` });
	return Counted;
}

function statQueryOf(fields: HostFields, algorithm: string): StatQuery {
	const query = { ...fields, algorithm };
	return isStatQuery(query) ? query : { algorithm };
}

function isStatQuery(
	held: TileProp & { readonly algorithm: string },
): held is TileProp & { readonly algorithm: string } & StatQuery {
	const texts = [held.field, held.date, held.window, held.compare];
	const isText = (text: unknown): boolean => text === undefined || typeof text === "string";
	return texts.every(isText) && (held.counts === undefined || Array.isArray(held.counts));
}

function pascalOf(word: string): string {
	return word.replace(/(^|-)(\w)/g, (_whole, _dash, letter: string) => letter.toUpperCase());
}
