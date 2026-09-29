import type { Action, CanResult, Patch, RecordRef, Row } from "./contract";

export interface ManyResult<Input, Output> {
	readonly done: readonly Output[];
	readonly failed: readonly { readonly input: Input; readonly failure: unknown }[];
}

export interface Upsert<T> {
	readonly ref?: RecordRef | null;
	readonly data: Partial<T>;
}

interface ManyOps<T, CreateIn, PatchIn> {
	createMany: Action<readonly CreateIn[], ManyResult<CreateIn, Row<T> | null>>;
	updateMany: Action<
		readonly { ref: RecordRef; data: PatchIn }[],
		ManyResult<{ ref: RecordRef; data: PatchIn }, Row<T> | null>
	>;
	removeMany: Action<readonly RecordRef[], ManyResult<RecordRef, void>>;
	upsert: Action<{ readonly ref?: RecordRef | null; readonly data: CreateIn & PatchIn }, Row<T> | null>;
}

interface ManyOf {
	create: "createMany";
	update: "updateMany";
	remove: "removeMany";
}

type UpsertOf<Verbs extends string> = "create" extends Verbs ? ("update" extends Verbs ? "upsert" : never) : never;

export type ManyVerbsOf<T, Verbs extends string, CreateIn = Partial<T>, PatchIn = Partial<T>> = Pick<
	ManyOps<T, CreateIn, PatchIn>,
	ManyOf[Extract<Verbs, keyof ManyOf>] | UpsertOf<Verbs>
>;

type Verb = ((input: never) => Promise<unknown>) & { can(): CanResult };

type Verbs = Partial<Record<"get" | keyof ManyOf, Verb>>;

type ManyName = keyof ManyOps<unknown, unknown, unknown>;

export const MANY_VERBS: readonly ManyName[] = ["createMany", "updateMany", "removeMany", "upsert"];

export function withManyVerbs<G extends object>(gateway: G): G {
	const { get, create, update, remove } = gateway as Verbs;
	const own = gateway as Partial<Record<ManyName, unknown>>;
	const many: Partial<Record<ManyName, unknown>> = {};
	if (create && !own.createMany) many.createMany = manyOver(create);
	if (update && !own.updateMany) many.updateMany = manyOver(update);
	if (remove && !own.removeMany) many.removeMany = manyOver(remove);
	if (get && create && update && !own.upsert) many.upsert = upsertOver(get, create, update);
	return Object.assign(gateway, many);
}

function derived<I, O>(from: Verb, run: (input: I) => Promise<O>): Action<I, O> {
	return Object.assign(run, { can: () => from.can() });
}

function manyOver(verb: Verb): Action<readonly unknown[], ManyResult<unknown, unknown>> {
	const run = verb as unknown as (input: unknown) => Promise<unknown>;
	return derived(verb, async (inputs: readonly unknown[]) => {
		const settled = await Promise.allSettled(inputs.map((input) => run(input)));
		const done: unknown[] = [];
		const failed: { input: unknown; failure: unknown }[] = [];
		settled.forEach((outcome, at) => {
			if (outcome.status === "fulfilled") done.push(outcome.value);
			else failed.push({ input: inputs[at], failure: outcome.reason });
		});
		return { done, failed };
	});
}

// TRADE-OFF: read, decide, write — no storage offers an atomic upsert, so a row made between get and create is doubled
function upsertOver(get: Verb, create: Verb, update: Verb): Action<Upsert<unknown>, unknown> {
	const read = get as unknown as (ref: RecordRef) => Promise<unknown>;
	const made = create as unknown as (data: unknown) => Promise<unknown>;
	const changed = update as unknown as (patch: Patch<unknown>) => Promise<unknown>;
	return Object.assign(
		async ({ ref, data }: Upsert<unknown>) => {
			if (ref && (await read(ref))) return changed({ ref, data });
			return made(data);
		},
		{ can: () => (create.can().can ? update.can() : create.can()) },
	);
}
