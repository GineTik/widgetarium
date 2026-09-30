import type { z } from "zod";
import type { TileProp, TileProps } from "../model.js";
import { ENGINE_GATEWAY } from "../gateway/adapted.js";
import type { AdaptedGateway } from "../gateway/adapted.js";
import { ICrudGateway, IValueGateway } from "../gateway/declared.js";
import type { Answer } from "../gateway/declared.js";
import { parseReadsBy } from "../gateway/parsed.js";
import type { GatewayContext } from "../gateway/problems.js";
import type { FileHost, FolderHost } from "../gateway/obsidian.js";
import type { DeclaredProp } from "../gateway/props.js";
import type {
	CollectionGateway,
	FilterRow,
	Query,
	RecordRef,
	Row,
	RowsResult,
	SortRow,
	ValueGateway,
} from "../gateway/contract.js";
import type { EveryValueVerb } from "../gateway/needs.js";
import type { GatewayRefs, ViewCell } from "../gateway/refs.js";

export interface HostFields extends TileProp {
	readonly picked?: unknown;
	readonly fieldFrom?: unknown;
	readonly whenNothingPicked?: unknown;
}

export interface HostSource {
	readonly implementation?: unknown;
	readonly fields?: unknown;
}

export interface HostSpec extends DeclaredProp {
	readonly type?: string | undefined;
	readonly where?: readonly FilterRow[] | undefined;
	readonly sort?: readonly SortRow[] | undefined;
	readonly source?: HostSource | undefined;
	readonly aka?: unknown;
}

export interface ShapeReader {
	readShape?(path: string): unknown;
}

export interface HostGatewayHost extends FolderHost, FileHost {
	readonly shapes?: ShapeReader | null | undefined;
}

export interface HostTile {
	readonly id: string;
	readonly props?: TileProps;
}

export type PatchStep = (inFlight: TileProp | null | undefined) => TileProp;

export interface HostGatewayContext {
	readonly name: string;
	readonly spec: HostSpec;
	readonly tile: HostTile;
	readonly refs: GatewayRefs;
	readonly host: HostGatewayHost;
	readonly cellFor: (key: string) => ViewCell;
	readonly propsRef: { readonly current: TileProps };
	readonly patchProp: (name: string, step: PatchStep) => void;
	readonly schema?: z.ZodType | undefined;
}

export type ImplementationContext = HostGatewayContext &
	Partial<GatewayContext> & {
		readonly tileConfig?: TileProp;
	};

export type HostGateway = AdaptedGateway | ValueGateway<number | null, EveryValueVerb>;

export interface EngineBacked {
	readonly [ENGINE_GATEWAY]: HostGateway;
}

type EngineKind = "value" | "collection";

const ENGINE_VERBS = ["list", "get", "create", "update", "remove", "replace", "repairIds"];

const BUILDS_NOTHING = "{implementation} declares no build";

const NOT_A_VERB = "{verb} is not a function";

const NEEDS_CONTEXT = "{implementation} is built with the context the host resolves it in";

const NOT_ROWS = "{implementation} answered a value where rows were declared";

export class EngineBackedValue extends IValueGateway implements EngineBacked {
	readonly [ENGINE_GATEWAY]: HostGateway;

	static build(_fields: HostFields, _context: ImplementationContext): HostGateway {
		throw new Error(BUILDS_NOTHING.replace("{implementation}", this.name));
	}

	constructor(fields?: HostFields | null, context?: ImplementationContext) {
		super();
		if (!context) throw new TypeError(NEEDS_CONTEXT.replace("{implementation}", new.target.name));
		this[ENGINE_GATEWAY] = parsedBy(new.target.build(fields ?? {}, context), context, "value");
	}

	override subscribe(changed: () => void): () => void {
		return this[ENGINE_GATEWAY].subscribe(() => changed());
	}

	get(input?: unknown): Answer<unknown> {
		return callEngine(this[ENGINE_GATEWAY], "get", input);
	}
}

export class EngineBackedRows extends ICrudGateway implements EngineBacked {
	readonly [ENGINE_GATEWAY]: HostGateway;

	static build(_fields: HostFields, _context: ImplementationContext): HostGateway {
		throw new Error(BUILDS_NOTHING.replace("{implementation}", this.name));
	}

	constructor(fields?: HostFields | null, context?: ImplementationContext) {
		super();
		if (!context) throw new TypeError(NEEDS_CONTEXT.replace("{implementation}", new.target.name));
		this[ENGINE_GATEWAY] = parsedBy(new.target.build(fields ?? {}, context), context, "collection");
	}

	override subscribe(changed: () => void): () => void {
		return this[ENGINE_GATEWAY].subscribe(() => changed());
	}

	list(query?: Query): Answer<RowsResult<unknown>> {
		return rowsEngineOf(this).list(query);
	}

	get(ref: RecordRef): Answer<Row<unknown> | null> {
		return rowsEngineOf(this).get(ref);
	}
}

installEngineVerbs(EngineBackedValue.prototype);
installEngineVerbs(EngineBackedRows.prototype);

function parsedBy(built: HostGateway, context: ImplementationContext, kind: EngineKind): HostGateway {
	if (!isParsing(context)) return built;
	return parseReadsBy(built, context, kind);
}

function isParsing(context: ImplementationContext): context is ImplementationContext & GatewayContext {
	return typeof context.parse === "function";
}

function callEngine(engine: HostGateway, verb: string, input: unknown): unknown {
	const held: unknown = Reflect.get(engine, verb);
	if (typeof held !== "function") throw new TypeError(NOT_A_VERB.replace("{verb}", verb));
	return Reflect.apply(held, engine, [input]);
}

function rowsEngineOf(backed: EngineBacked): CollectionGateway<unknown> {
	const engine = backed[ENGINE_GATEWAY];
	if (engine.kind === "collection") return engine;
	throw new TypeError(NOT_ROWS.replace("{implementation}", engine.id));
}

function installEngineVerbs(prototype: EngineBacked): void {
	const missing = ENGINE_VERBS.filter((verb) => !Object.prototype.hasOwnProperty.call(prototype, verb));
	for (const verb of missing)
		Object.defineProperty(prototype, verb, {
			value(this: EngineBacked, input: unknown): unknown {
				return callEngine(this[ENGINE_GATEWAY], verb, input);
			},
		});
}
