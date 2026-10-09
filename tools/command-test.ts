import { JSDOM } from "jsdom";
import { declarationIn, manifestOfModule, z } from "../packages/core/src/gateway/declared.ts";
import { ICommand, IQuery } from "../packages/core/src/gateway/queries.ts";
import type { Command } from "../packages/core/src/gateway/declared.ts";
import type { CommandAnswer } from "../packages/core/src/gateway/run-handler.ts";
import type { Query, RowsResult } from "../packages/core/src/gateway/contract.ts";
import type { HandlerContext } from "../packages/core/src/gateway/handler-context.ts";
import { defineCommandMetadata } from "../packages/core/src/gateway/implementation-metadata.ts";
import { definePack, registerPacks } from "../packages/core/src/engine/packs.ts";
import { canOf, rowOf } from "../packages/core/src/gateway/create.ts";
import { commandBindingOf } from "../packages/core/src/surface/command-binding.ts";
import { normalizeBoard } from "../packages/core/src/model.ts";
import { byId } from "./dom-find.ts";
import { present } from "./page-dom.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	Event: dom.window.Event,
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { useData } = await import("../packages/core/src/gateway/use-data.ts");
const { createWidget } = await import("../packages/core/src/widget-api.js");
const { useHostCommands } = await import("../packages/core/src/surface/host-commands.ts");
const { createGatewayRefs } = await import("../packages/core/src/gateway/refs.ts");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const SubscriptionSchema = z.object({ plan: z.string() });
const SubscribeSchema = z.object({ plan: z.string().min(1) });

const stripe: { plans: string[] } = { plans: ["basic"] };

class StripeSubscriptions extends IQuery.output(z.array(SubscriptionSchema)) {
	list(query?: Query): RowsResult<{ plan: string }> {
		const rows = stripe.plans.map((plan) => rowOf<{ plan: string }>({ plan }, plan));
		return { rows: rows.slice(0, query?.limit ?? rows.length), total: rows.length };
	}
}

const ReceiptSchema = z.object({ id: z.string().startsWith("ch_") });

class StripeCharge extends ICommand.input(SubscribeSchema).output(ReceiptSchema) {
	run(input: { plan: string }): { id: string } {
		return { id: input.plan === "unsigned" ? input.plan : `ch_${input.plan}` };
	}
}

class StripeSubscribe extends ICommand.input(SubscribeSchema) {
	run(input: { plan: string }): void {
		if (input.plan === "refused") throw new Error("Stripe declined the card");
		stripe.plans = [...stripe.plans, input.plan];
	}
}

interface Seen {
	readonly plans: readonly string[];
	readonly subscribe: Command<{ plan: string }>;
	readonly refresh: Command<void>;
	readonly charge: Command<{ plan: string }, { id: string }>;
}

const seen: Seen[] = [];
const Billing = createWidget({
	inject: {
		subscriptions: IQuery.output(z.array(SubscriptionSchema)),
		subscribe: ICommand.input(SubscribeSchema),
		refresh: ICommand,
		charge: ICommand.input(SubscribeSchema).output(ReceiptSchema),
	},
	draw: ({ subscriptions, subscribe, refresh, charge }) => {
		const read = useData(subscriptions);
		seen.push({ plans: read.data.map((row) => row.plan), subscribe, refresh, charge });
		return null;
	},
});

const last = (): Seen => present(seen[seen.length - 1], "a drawn billing widget");
const tick = () => new Promise((settled) => setTimeout(settled, 0));

render(
	h(Billing, {
		subscriptions: new StripeSubscriptions(),
		subscribe: new StripeSubscribe(),
		charge: new StripeCharge(),
	}),
	byId(document, "host"),
);
await tick();
check("the query draws what the implementation lists", last().plans, ["basic"]);

const answer = await last().subscribe({ plan: "pro" });
check("a command whose handler declares no output answers ok with none", Object.entries(answer), [
	["ok", true],
	["output", null],
]);
await Promise.resolve();
check("and its tile's queries re-read before the promise settles", last().plans, ["basic", "pro"]);

const declined: CommandAnswer = await last().subscribe({ plan: "refused" });
check("a command that throws answers ok false with the reason, never having acted", declined, {
	ok: false,
	reason: "Stripe declined the card",
	ran: false,
});

const invalid = await last().subscribe({ plan: "" });
check("an input the schema refuses never reaches the implementation", invalid.ok, false);
check("and nothing was written", stripe.plans, ["basic", "pro"]);

check("a command nobody fed can run", last().refresh.can(), { can: true });
const printedUnfed: unknown[][] = [];
const printingUnfed = console.log;
console.log = (...parts: unknown[]): void => void printedUnfed.push(parts);
const unfed = await last().refresh();
console.log = printingUnfed;
check(
	"and prints what it was sent instead of acting",
	[unfed, printedUnfed],
	[{ ok: true }, [["[widgetarium] refresh sent", undefined]]],
);

check("a handler's output reaches the widget beside ok", await last().charge({ plan: "pro" }), {
	ok: true,
	output: { id: "ch_pro" },
});
const unsigned = await last().charge({ plan: "unsigned" });
check(
	"an output the handler's schema refuses answers ok false and ran, never a throw",
	unsigned.ok ? unsigned : [unsigned.ran, unsigned.reason.split(":")[0]],
	[true, "StripeCharge answered an output its schema refuses"],
);

const refusalOf = (declare: () => unknown): string => {
	try {
		declare();
		return "declared";
	} catch (refused: unknown) {
		return refused instanceof Error ? (refused.message.split(" (")[0] ?? "") : String(refused);
	}
};
const REFUSED_TRANSFORM = ".output() refuses a schema holding a transform or a pipe";
check(
	"an output holding a transform is refused on either side, at any depth",
	[
		refusalOf(() => IQuery.output(z.object({ count: z.string().transform(Number) }))),
		refusalOf(() => IQuery.input(z.string()).output(z.array(z.preprocess(String, z.string())))),
		refusalOf(() => ICommand.input(z.string()).output(z.object({ id: z.string().pipe(z.string().min(1)) }).nullable())),
	],
	[REFUSED_TRANSFORM, REFUSED_TRANSFORM, REFUSED_TRANSFORM],
);
check(
	"while .default and .catch parse to themselves and stay allowed",
	refusalOf(() => ICommand.input(z.string()).output(z.object({ id: z.string().default("x").catch("y") }))),
	"declared",
);

const SWITCHED_OFF_PROBE = "@test/probe";
const probed: Record<string, { run(input: unknown): Promise<unknown> }>[] = [];
const probeTile = present(
	normalizeBoard({
		tiles: [
			{ id: "p1", widget: SWITCHED_OFF_PROBE, props: { press: { implementation: "@core/console-log", allow: [] } } },
		],
	}).tiles[0],
	"the probe tile",
);
const refs = createGatewayRefs();
function HostCommandProbe(): null {
	probed.push(
		useHostCommands({ id: SWITCHED_OFF_PROBE, commands: { press: { label: "Press" } } }, probeTile, refs, {}),
	);
	return null;
}
render(h(HostCommandProbe), byId(document, "host"));
await tick();
check(
	"a refused host command answers instead of throwing",
	await present(probed[probed.length - 1]?.["press"], "the switched-off press").run(1),
	{ ok: false, reason: '"press" is switched off for this tile', ran: false },
);

check(
	"ICommand.input declares a command over its schema",
	declarationIn(ICommand.input(SubscribeSchema))?.kind,
	"command",
);
check("a bare ICommand is a command that takes nothing", declarationIn(ICommand)?.kind, "command");

const manifest = manifestOfModule({
	default: Billing,
	metadata: { title: "Billing", description: "Plans", props: { subscribe: { label: "Subscribe" } } },
	layout: { role: "content", size: { preferredWidth: 320, preferredHeight: "auto" } },
});
check(
	"commands reach the manifest beside props, not inside them",
	[Object.keys(manifest?.props ?? {}), manifest?.["commands"]],
	[
		["subscriptions"],
		{ subscribe: { label: "Subscribe" }, refresh: { label: "refresh" }, charge: { label: "charge" } },
	],
);

check(
	"a command with a manifest source and no binding of its own points at its sibling",
	commandBindingOf(
		present(normalizeBoard({ tiles: [{ id: "t1", widget: "@test/notice" }] }).tiles[0], "a tile"),
		"press",
		{
			label: "Press",
			source: { implementation: "@core/value-set", fields: { target: "pressed" } },
		},
	),
	{ implementation: "@core/value-set", fields: { target: "t1/pressed" } },
);
check("a can() that answers something else is no permission", canOf({ can: () => "yes" }), {
	can: false,
	reason: "its can() answered something that is not a decision",
});

console.log("\n— a handler is handed ctx beside its input —");
const handedToRun: HandlerContext[] = [];
const pings: Command<string>[] = [];
const Pinger = createWidget({
	inject: { ping: ICommand.input(z.string()) },
	draw: ({ ping }) => {
		pings.push(ping);
		return null;
	},
});
render(
	h(Pinger, {
		ping: {
			run: (_input: string, ctx: HandlerContext): void => void handedToRun.push(ctx),
		},
	}),
	byId(document, "host"),
);
await tick();
await present(pings[pings.length - 1], "the drawn ping")("hello");
const ranWith = present(handedToRun[0], "the ctx a widget's command was handed");
check(
	"a command handed by the widget's parent gets ctx: no user yet, a live signal, a shut host named for the prop",
	[ranWith.user, ranWith.signal instanceof AbortSignal, ranWith.signal.aborted, ranWith.host.self],
	[null, true, false, "ping"],
);
check(
	"and the shut host refuses by name instead of answering empty",
	await ranWith.host.confirm("delete?").then(
		() => "answered",
		(refusal: unknown) => (refusal instanceof Error ? refusal.message : String(refusal)),
	),
	"ports are not available to ping",
);
render(null, byId(document, "host"));
check("and the signal is aborted once the widget is gone", ranWith.signal.aborted, true);

class CtxProbeCommand extends ICommand.input(z.number()) {
	constructor(readonly fields: object) {
		super();
	}
	run(_input: number, ctx: HandlerContext): void {
		handedToRun.push(ctx);
	}
}
registerPacks(
	definePack({
		id: "@ctx-probe",
		title: "Ctx probe",
		queries: [],
		commands: [
			defineCommandMetadata(CtxProbeCommand, {
				id: "@ctx-probe/run",
				title: "Probe",
				resource: "Console",
				description: "Records the ctx it is handed.",
				fields: z.looseObject({}),
				consent: "free",
			}),
		],
	}),
);
const ctxTile = present(
	normalizeBoard({
		tiles: [{ id: "c1", widget: "@test/ctx", props: { press: { implementation: "@ctx-probe/run" } } }],
	}).tiles[0],
	"the ctx probe tile",
);
function CtxCommandProbe(): null {
	probed.push(useHostCommands({ id: "@test/ctx", commands: { press: { label: "Press" } } }, ctxTile, refs, {}));
	return null;
}
render(h(CtxCommandProbe), byId(document, "host"));
await tick();
await present(probed[probed.length - 1]?.["press"], "the ctx probe press").run(1);
const hostRanWith = present(handedToRun[1], "the ctx a pack command was handed");
check(
	"a pack command gets ctx whose host is the ports it was built with",
	[hostRanWith.user, hostRanWith.signal.aborted, hostRanWith.host.self],
	[null, false, "c1/press"],
);

const { checkMoreDuringReread, checkPageLaws, checkPagedReads } = await import("./page-query-checks.ts");
await checkPagedReads(check);
await checkMoreDuringReread(check);
await checkPageLaws(check);
console.log(`\n${failed === 0 ? "commands: clean" : `commands: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
