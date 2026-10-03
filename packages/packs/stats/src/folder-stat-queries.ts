import { z } from "zod";
import type { ValueGateway } from "@widgetarium/core/gateway/contract.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { StatAlgorithm, StatQuery } from "@widgetarium/core/engine/stat-fields.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import type { QueryPorts } from "@widgetarium/core/engine/packs.js";
import { READS_AS_IS, folderRows } from "@widgetarium/pack-obsidian";
import { statGateway } from "./stat-of.js";

export class FolderStatQuery extends IQuery.returns(z.number().nullable()) {
	static algorithm: string = "count";

	private readonly counted: ValueGateway<number | null, EveryValueVerb>;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		const { notes, refs } = ports;
		const rows = folderRows({ notes, refs, fields, declared: READS_AS_IS, requested: ["list"] });
		this.counted = statGateway(rows, statQueryOf(fields, new.target.algorithm));
	}

	get(): Promise<number | null> {
		return this.counted.get();
	}

	override subscribe(changed: () => void): () => void {
		return this.counted.subscribe(() => changed());
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
	held: HostFields & { readonly algorithm: string },
): held is HostFields & { readonly algorithm: string } & StatQuery {
	const texts = [held.field, held.date, held.window, held.compare];
	const isText = (text: unknown): boolean => text === undefined || typeof text === "string";
	return texts.every(isText) && (held.counts === undefined || Array.isArray(held.counts));
}

function pascalOf(word: string): string {
	return word.replace(/(^|-)(\w)/g, (_whole, _dash, letter: string) => letter.toUpperCase());
}
