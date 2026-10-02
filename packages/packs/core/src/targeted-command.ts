import type { z } from "zod";
import type { CanResult } from "@widgetarium/core/gateway/contract.js";
import { canOf } from "@widgetarium/core/gateway/create.js";
import { ICommand } from "@widgetarium/core/gateway/queries.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";

export type Verbs = Readonly<Record<string, unknown>>;

export type Write = (verbs: Verbs, input: unknown) => Promise<unknown>;

export interface TargetFields {
	readonly target?: unknown;
}

type Decision = { readonly can: true; readonly verbs: Verbs } | { readonly can: false; readonly reason: string };

const NOTHING_NAMED = '"{name}" names nothing to change: pick it in the settings window';
const TARGET_GONE = '"{name}" changes {ref}, which is no longer on this board';
const TARGET_CANNOT = "{ref} cannot {verb}";

const RUNNING_ON_TARGET = new Map<string, Promise<unknown>>();

export function targetedCommand<const S extends z.ZodType>(input: S, verb: string, write: Write) {
	return class extends ICommand.takes(input) {
		constructor(
			readonly fields: TargetFields,
			readonly ports: ImplementationPorts,
		) {
			super();
		}

		can(): CanResult {
			const decided = decisionOf(this.fields, this.ports, verb);
			return decided.can ? { can: true } : decided;
		}

		run(sent: z.output<S>): Promise<void> {
			const target = targetIn(this.fields) ?? this.ports.self;
			return runAfterOthersOn(target, async () => {
				const decided = decisionOf(this.fields, this.ports, verb);
				if (!decided.can) throw new Error(decided.reason);
				await write(decided.verbs, sent);
			});
		}
	};
}

export function call(verbs: Verbs, verb: string, input: unknown): Promise<unknown> {
	const held = verbs[verb];
	if (typeof held !== "function") return Promise.reject(new Error(cannot("the list", verb)));
	return Promise.resolve(Reflect.apply(held, verbs, [input]));
}

export function cannot(ref: string, verb: string): string {
	return TARGET_CANNOT.replace("{ref}", ref).replace("{verb}", verb);
}

function decisionOf(fields: TargetFields, ports: ImplementationPorts, verb: string): Decision {
	const target = targetIn(fields);
	if (!target) return { can: false, reason: NOTHING_NAMED.replace("{name}", nameOf(ports.self)) };
	const verbs = ports.refs.get(target);
	if (!isObject(verbs))
		return { can: false, reason: TARGET_GONE.replace("{name}", nameOf(ports.self)).replace("{ref}", target) };
	if (typeof verbs[verb] !== "function") return { can: false, reason: cannot(target, verb) };
	const asked = canOf(verbs[verb]);
	return asked.can ? { can: true, verbs } : asked;
}

function targetIn(fields: TargetFields): string | null {
	const parsed = PropRefSchema.safeParse(fields.target);
	return parsed.success ? parsed.data : null;
}

function nameOf(self: string): string {
	return self.slice(self.indexOf("/") + 1);
}

function runAfterOthersOn(target: string, run: () => Promise<void>): Promise<void> {
	const before = RUNNING_ON_TARGET.get(target) ?? Promise.resolve();
	const next = before.then(run, run);
	RUNNING_ON_TARGET.set(target, next);
	return next.finally(() => {
		if (RUNNING_ON_TARGET.get(target) === next) RUNNING_ON_TARGET.delete(target);
	});
}
