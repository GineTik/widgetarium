import type { Action, RecordRef, Row } from "./contract";
import type { LooseAction } from "./verbs-of";
import { actionOf, verbOf } from "./verbs-of";

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

type ManyName = keyof ManyOps<unknown, unknown, unknown>;

export const MANY_VERBS: readonly ManyName[] = ["createMany", "updateMany", "removeMany", "upsert"];

export function withManyVerbs<G extends object>(gateway: G): G {
	const get = actionOf(gateway, "get");
	const create = actionOf(gateway, "create");
	const update = actionOf(gateway, "update");
	const remove = actionOf(gateway, "remove");
	const isOwn = (verb: ManyName) => Boolean(verbOf(gateway, verb));
	const many: Partial<Record<ManyName, unknown>> = {};
	if (create && !isOwn("createMany")) many.createMany = manyOver(create);
	if (update && !isOwn("updateMany")) many.updateMany = manyOver(update);
	if (remove && !isOwn("removeMany")) many.removeMany = manyOver(remove);
	if (get && create && update && !isOwn("upsert")) many.upsert = upsertOver(get, create, update);
	return Object.assign(gateway, many);
}

function deriveVerb<I, O>(from: LooseAction, run: (input: I) => Promise<O>): Action<I, O> {
	return Object.assign(run, { can: () => from.can() });
}

function manyOver(verb: LooseAction): Action<readonly unknown[], ManyResult<unknown, unknown>> {
	return deriveVerb(verb, async (inputs: readonly unknown[]) => {
		const settled = await Promise.allSettled(inputs.map((input) => verb(input)));
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
function upsertOver(get: LooseAction, create: LooseAction, update: LooseAction): Action<Upsert<unknown>, unknown> {
	return Object.assign(
		async ({ ref, data }: Upsert<unknown>) => {
			if (ref && (await get(ref))) return update({ ref, data });
			return create(data);
		},
		{ can: () => (create.can().can ? update.can() : create.can()) },
	);
}
