import { z } from "zod";
import type { Query, Row, RowsResult, SortRow } from "./contract";
import { COLLECTION_VERBS, VALUE_VERBS } from "./contract";
import type {
	ConfigureMounts,
	FoldIntoGroup,
	Here,
	MountEntry,
	MountRow,
	Navigation,
	PassageReader,
	Slot,
	ViewHost,
	WidgetCatalogue,
} from "./host";
import type { DeclaredFilterRow, HeldSpec, ModuleManifest, RecordRef as RecordRefType } from "./manifest";
import { manifestOfDeclared, sizeProblems } from "./manifest";
import type { Declaration } from "./declaration";
import { BARE_QUERY, DECLARATION, QUERY_WITHOUT_SCHEMA, declarationIn } from "./declaration";
import {
	refuseEmptyMigrations,
	refuseImplementations,
	refuseMetadataForNothing,
	refuseSourcesOverNothing,
	refuseUndeclared,
	migrationOfDeclared,
	partsOfDeclared,
} from "./written";
import type {
	CreateInOf,
	DeclaredModule,
	DeclaredProps,
	DeclaredWidget,
	gatewayKind,
	ListDeclared,
	MigrationStep,
	passedAs,
	PatchInOf,
	ReadOf,
	SchemaOrShapes,
	ValueDeclared,
	ValueInOf,
	WidgetLayout,
	WidgetMetadata,
} from "./declared-types";
export type {
	Command,
	DeclaredModule,
	DeclaredProps,
	DeclaredWidget,
	DrawnProps,
	GivenProps,
	Implementation,
	ListDeclared,
	MigrationStep,
	PropMetadata,
	ShapesOf,
	TileProp,
	ValueDeclared,
	WidgetLayout,
	WidgetMetadata,
	WidgetProp,
} from "./declared-types";

export { z };

declare module "zod/v4/core" {
	interface GlobalMeta {
		aka?: readonly string[];
	}
}
export { declarationIn, defaultOf } from "./declaration";

export type RecordRef = RecordRefType;

export const RecordRefSchema = z.custom<RecordRefType>((held) => typeof held === "string" && held !== "", {
	message: "a record's address is a non-empty string",
});

export const VaultRecordSchema = z.looseObject({
	path: z.string().optional(),
	name: z.string().optional(),
	props: z.record(z.string(), z.unknown()).optional(),
});

export type VaultRecord = z.infer<typeof VaultRecordSchema>;

const DEFINED_PROPS = Symbol.for("widgetarium.defined-props");

export type Read = "list" | "get";

export type CollectionWrite = Exclude<(typeof COLLECTION_VERBS)[number], Read>;
export type ValueWrite = Exclude<(typeof VALUE_VERBS)[number], Read>;

const IMPLEMENTATION_WRITES = ["replace", "repairIds"] as const;

export type ImplementationWrite = (typeof IMPLEMENTATION_WRITES)[number];

const COLLECTION_WRITES = COLLECTION_VERBS.filter(isWrite) as readonly CollectionWrite[];
const VALUE_WRITES = VALUE_VERBS.filter(isWrite) as readonly ValueWrite[];
const VALUE_READS: readonly Read[] = ["get"];
const COLLECTION_READS: readonly Read[] = ["list", "get"];
const PICKABLE_COLLECTION_WRITES: readonly string[] = [...COLLECTION_WRITES, ...IMPLEMENTATION_WRITES];

export interface ListOptions<Held> {
	readonly where?: readonly DeclaredFilterRow[];
	readonly sort?: readonly SortRow[];
	readonly default?: readonly Partial<Held>[];
}

export interface SlotOptions {
	readonly default?: string;
	readonly surface?: string;
	readonly gives?: Readonly<Record<string, readonly string[]>>;
}

export interface MountsOptions {
	readonly default?: readonly MountRow[];
	readonly was?: string;
}

export type AbstractOf<Instance> = abstract new () => Instance;

type NamedKeys<T> = keyof { [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K] };

export type RefReserved<Row> =
	"ref" extends NamedKeys<Row>
		? [Row[Extract<"ref", keyof Row>]] extends [RecordRefType | undefined]
			? unknown
			: { "the field ref is reserved: type it as RecordRef or leave it out of the row": never }
		: unknown;

export type PassedDeclared<Drawn> = AbstractOf<object> & { readonly [passedAs]?: Drawn };

const PICKED_UNKNOWN_WRITE = 'pick() names "{verb}", which a {kind} does not write — it writes {known}';
const PICKED_WRITE_ON_A_LIST = 'pick() names "{verb}", and an IListGateway only reads — declare ICrudGateway to write';

export type Answer<O> = O | Promise<O>;

type GatewayKind = "value" | "list" | "crud";

type KindedClass = { readonly [gatewayKind]?: GatewayKind };

type DeclaredBy<C, X> = C extends { readonly [gatewayKind]?: "value" }
	? ValueDeclared<ReadOf<X>, "get" | ValueWrite, ValueInOf<X>>
	: C extends { readonly [gatewayKind]?: "crud" }
		? ListDeclared<ReadOf<X>, Read | CollectionWrite, CreateInOf<X>, PatchInOf<X>>
		: C extends { readonly [gatewayKind]?: "list" }
			? ListDeclared<ReadOf<X>, Read, CreateInOf<X>, PatchInOf<X>, Read>
			: never;

type OptionsBy<C, X> = C extends { readonly [gatewayKind]?: "value" }
	? Readonly<Record<string, never>>
	: ListOptions<ReadOf<X>>;

const OUTSIDE_THE_ROOT = 'prop "{name}" is a class that does not extend IBaseGateway, so it declares no gateway';

const VALUE_TAKES_NO_OPTIONS =
	"of() takes no options for a value ({keys}) — say them in defineMetadata: props.<name>.keep for a value the screen keeps, props.<name>.source for where it starts from";

const ROOT_OF =
	"IBaseGateway.of() declares nothing: a gateway is a value or a list — declare IValueGateway.of, IListGateway.of, ICrudGateway.of or an interface extending one";

export abstract class IBaseGateway {
	declare static readonly [gatewayKind]?: GatewayKind;
	subscribe?(changed: () => void): () => void;

	static of<C extends KindedClass, const X extends SchemaOrShapes>(
		this: C,
		schemas: X & RefReserved<ReadOf<X>>,
		options?: OptionsBy<C, X>,
	): DeclaredBy<C, X>;
	static of(
		this: AbstractOf<IBaseGateway>,
		schemas: SchemaOrShapes,
		options: ListOptions<unknown> = {},
	): AbstractOf<IBaseGateway> {
		const root = declarationIn(this);
		if (!root) throw new Error(ROOT_OF);
		if (root.kind === "value" && Object.keys(options).length > 0)
			throw new Error(VALUE_TAKES_NO_OPTIONS.replace("{keys}", Object.keys(options).join(", ")));
		return declaredClassOf(this, {
			kind: root.kind,
			...schemasOf(schemas),
			reads: root.reads ?? [],
			...(root.pickableWrites ? { pickableWrites: root.pickableWrites } : {}),
			writes: root.writes,
			...(root.kind === "value" ? {} : listOptions(options)),
		});
	}
}

export abstract class ValueContract<T> extends IBaseGateway {
	abstract get(): Answer<T | null>;
}

export abstract class ListContract<T> extends IBaseGateway {
	abstract list(query?: Query): Answer<RowsResult<T>>;
	abstract get(ref: RecordRef): Answer<Row<T> | null>;
}

export abstract class IValueGateway extends ValueContract<unknown> {
	declare static readonly [gatewayKind]?: "value";
}

export abstract class IListGateway extends ListContract<unknown> {
	declare static readonly [gatewayKind]?: "list";
}

export abstract class ICrudGateway extends ListContract<unknown> {
	declare static readonly [gatewayKind]?: "crud";
}

Object.defineProperty(IValueGateway, DECLARATION, {
	value: { kind: "value", schema: z.unknown(), reads: VALUE_READS, writes: VALUE_WRITES },
});
Object.defineProperty(IListGateway, DECLARATION, {
	value: { kind: "collection", schema: z.unknown(), reads: COLLECTION_READS, writes: [], pickableWrites: [] },
});
Object.defineProperty(ICrudGateway, DECLARATION, {
	value: { kind: "collection", schema: z.unknown(), reads: COLLECTION_READS, writes: COLLECTION_WRITES },
});

export type ISlot<Given = Readonly<Record<string, unknown>>> = Slot<Given>;
export const ISlot = {
	of<Given = Readonly<Record<string, unknown>>>(options: SlotOptions = {}): PassedDeclared<Slot<Given>> {
		return createHeldClass("slot", { of: "widget", ...options }) as PassedDeclared<Slot<Given>>;
	},
};

export type IMounts = readonly MountEntry[];
export const IMounts = {
	of(options: MountsOptions = {}): PassedDeclared<IMounts> {
		return createHeldClass("mounts", { default: [], ...options }) as PassedDeclared<IMounts>;
	},
};

export type IHost = ViewHost;
export const IHost = createPassedClass("host") as PassedDeclared<IHost>;
export type INavigator = Navigation;
export const INavigator = createPassedClass("navigator") as PassedDeclared<INavigator>;
export type IHere = Here | null;
export const IHere = createPassedClass("here") as PassedDeclared<IHere>;
export type ICatalogue = WidgetCatalogue;
export const ICatalogue = createPassedClass("catalogue") as PassedDeclared<ICatalogue>;
export type IFoldIntoGroup = FoldIntoGroup;
export const IFoldIntoGroup = createPassedClass("foldIntoGroup") as PassedDeclared<IFoldIntoGroup>;
export type IConfigureMounts = ConfigureMounts;
export const IConfigureMounts = createPassedClass("configureMounts") as PassedDeclared<IConfigureMounts>;
export type IContent = string | null;
export const IContent = createPassedClass("content") as PassedDeclared<IContent>;
export type IReader = PassageReader;
export const IReader = createPassedClass("reader") as PassedDeclared<IReader>;

export function defineProps<const P extends DeclaredProps>(props: P): P {
	refuseOutsideTheRoot(props);
	refuseBareQuery(props);
	refuseUndeclared(props);
	refuseImplementations(props);
	Object.defineProperty(props, DEFINED_PROPS, { value: true });
	return props;
}

export function defineMetadata<P extends DeclaredProps>(
	of: P | DeclaredWidget<P>,
	metadata: WidgetMetadata<P>,
): WidgetMetadata<P> {
	refuseMetadataForNothing(propsIn(of), metadata.props ?? {});
	refuseSourcesOverNothing(propsIn(of), metadata.props ?? {});
	return metadata;
}

export function defineLayout(layout: WidgetLayout): WidgetLayout {
	const problems = sizeProblems(layout.size);
	if (problems.length > 0) throw new Error(problems.join("; "));
	return layout;
}

export function defineMigrations<const Steps extends readonly MigrationStep<DeclaredProps>[]>(steps: Steps): Steps {
	refuseEmptyMigrations(steps);
	return steps;
}

export function manifestOfModule(module: DeclaredModule): ModuleManifest | null {
	const props = module.default?.declared;
	if (!props) return null;
	const { props: described, ...card } = module.metadata ?? {};
	refuseMetadataForNothing(props, described ?? {});
	refuseSourcesOverNothing(props, described ?? {});
	refuseBareQuery(props);
	refuseUndeclared(props);
	const input = {
		...card,
		...module.layout,
		...partsOfDeclared(props, described ?? {}),
		...(module.migrations ? { migrate: module.migrations.map(migrationOfDeclared) } : {}),
	};
	return manifestOfDeclared(input);
}

export function isDeclaredProps(held: unknown): held is DeclaredProps {
	return typeof held === "object" && held !== null && DEFINED_PROPS in held && held[DEFINED_PROPS] === true;
}

function refuseOutsideTheRoot(props: DeclaredProps) {
	const named = Object.keys(props).find((name) => {
		const held = props[name] as unknown;
		return typeof held === "function" && !(held.prototype instanceof IBaseGateway);
	});
	if (named) throw new Error(OUTSIDE_THE_ROOT.replace("{name}", named));
}

function refuseBareQuery(props: DeclaredProps) {
	const named = Object.keys(props).find((name) => isBareQuery(props[name]));
	if (named) throw new Error(QUERY_WITHOUT_SCHEMA.replace("{name}", named));
}

function isBareQuery(held: unknown): boolean {
	return typeof held === "function" && BARE_QUERY in held;
}

function propsIn<P extends DeclaredProps>(of: P | DeclaredWidget<P>): P {
	return typeof of === "function" ? (of as DeclaredWidget<P>).declared : (of as P);
}

function isWrite(verb: string) {
	return verb !== "list" && verb !== "get";
}

function refuseUnknownWrites(declaration: Declaration, verbs: readonly string[]) {
	const known =
		declaration.pickableWrites ??
		(declaration.kind === "collection" ? PICKABLE_COLLECTION_WRITES : (VALUE_WRITES as readonly string[]));
	const unknown = verbs.find((verb) => isWrite(verb) && !known.includes(verb));
	if (!unknown) return;
	if (known.length === 0) throw new Error(PICKED_WRITE_ON_A_LIST.replace("{verb}", unknown));
	throw new Error(
		PICKED_UNKNOWN_WRITE.replace("{verb}", unknown)
			.replace("{kind}", declaration.kind)
			.replace("{known}", known.join(", ")),
	);
}

function declaredClassOf(base: AbstractOf<IBaseGateway>, declaration: Declaration): AbstractOf<IBaseGateway> {
	abstract class Declared extends base {
		static pick(...verbs: string[]) {
			refuseUnknownWrites(declaration, verbs);
			return declaredClassOf(this, {
				...declaration,
				reads: verbs.filter((verb) => !isWrite(verb)),
				writes: verbs.filter(isWrite),
			});
		}
	}
	Object.defineProperty(Declared, DECLARATION, { value: declaration });
	return Declared;
}

function createHeldClass(kind: "slot" | "mounts", held: Readonly<HeldSpec>) {
	abstract class Held extends IBaseGateway {}
	Object.defineProperty(Held, DECLARATION, { value: { kind, schema: z.unknown(), writes: [], held } });
	return Held;
}

function createPassedClass(passed: string) {
	abstract class Passed extends IBaseGateway {}
	Object.defineProperty(Passed, DECLARATION, { value: { kind: "passed", schema: z.unknown(), writes: [], passed } });
	return Passed;
}

const SHAPE_KEYS = ["read", "create", "update", "other"];
const SHAPE_UNKNOWN = 'of() names "{key}", which is not a schema it reads — it takes read, create, update and other';
const SHAPE_WITHOUT_READ = "of() names no schema for reading — give read, or other for every verb not named";

function schemasOf(given: SchemaOrShapes): Pick<Declaration, "schema" | "create" | "update"> {
	if (given instanceof z.ZodType) return { schema: given };
	const shapes = given as Readonly<Record<string, z.ZodType | undefined>>;
	const unknownKey = Object.keys(shapes).find((key) => !SHAPE_KEYS.includes(key));
	if (unknownKey) throw new Error(SHAPE_UNKNOWN.replace("{key}", unknownKey));
	const read = shapes["read"] ?? shapes["other"];
	if (!read) throw new Error(SHAPE_WITHOUT_READ);
	const create = shapes["create"] ?? shapes["other"];
	const update = shapes["update"] ?? shapes["other"];
	return { schema: read, ...(create ? { create } : {}), ...(update ? { update } : {}) };
}

function listOptions<Held>(options: ListOptions<Held>) {
	return {
		...(options.where ? { where: options.where } : {}),
		...(options.sort ? { sort: options.sort } : {}),
		...(options.default ? { rows: options.default } : {}),
	};
}
