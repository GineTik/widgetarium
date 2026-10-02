import { JSDOM } from "jsdom";
import { declarationIn, manifestOfModule, z } from "../packages/core/src/gateway/declared.ts";
import { ICommand, IQuery } from "../packages/core/src/gateway/queries.ts";
import type { Command } from "../packages/core/src/gateway/declared.ts";
import type { CommandAnswer } from "../packages/core/src/gateway/queries.ts";
import type { Query, RowsResult } from "../packages/core/src/gateway/contract.ts";
import { rowOf } from "../packages/core/src/gateway/create.ts";
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

class StripeSubscriptions extends IQuery.of(z.array(SubscriptionSchema)) {
	list(query?: Query): RowsResult<{ plan: string }> {
		const rows = stripe.plans.map((plan) => rowOf<{ plan: string }>({ plan }, plan));
		return { rows: rows.slice(0, query?.limit ?? rows.length), total: rows.length };
	}
}

class StripeSubscribe extends ICommand.of(SubscribeSchema) {
	run(input: { plan: string }): void {
		if (input.plan === "refused") throw new Error("Stripe declined the card");
		stripe.plans = [...stripe.plans, input.plan];
	}
}

interface Seen {
	readonly plans: readonly string[];
	readonly subscribe: Command<{ plan: string }>;
	readonly refresh: Command<void>;
}

const seen: Seen[] = [];
const Billing = createWidget({
	inject: {
		subscriptions: IQuery.of(z.array(SubscriptionSchema)),
		subscribe: ICommand.of(SubscribeSchema),
		refresh: ICommand,
	},
	draw: ({ subscriptions, subscribe, refresh }) => {
		const read = useData(subscriptions);
		seen.push({ plans: read.data.map((row) => row.plan), subscribe, refresh });
		return null;
	},
});

const last = (): Seen => present(seen[seen.length - 1], "a drawn billing widget");
const tick = () => new Promise((settled) => setTimeout(settled, 0));

render(
	h(Billing, { subscriptions: new StripeSubscriptions(), subscribe: new StripeSubscribe() }),
	byId(document, "host"),
);
await tick();
check("the query draws what the implementation lists", last().plans, ["basic"]);

const answer = await last().subscribe({ plan: "pro" });
check("a command answers only a status", answer, { ok: true });
await Promise.resolve();
check("and its tile's queries re-read before the promise settles", last().plans, ["basic", "pro"]);

const declined: CommandAnswer = await last().subscribe({ plan: "refused" });
check("a command that throws answers ok false with the reason", declined, {
	ok: false,
	reason: "Stripe declined the card",
});

const invalid = await last().subscribe({ plan: "" });
check("an input the schema refuses never reaches the implementation", invalid.ok, false);
check("and nothing was written", stripe.plans, ["basic", "pro"]);

check("a command nobody bound cannot run, and says why", last().refresh.can(), {
	can: false,
	reason: '"refresh" is not set up: pick what runs it in the settings window',
});
check("and answers that reason when pressed", await last().refresh(), {
	ok: false,
	reason: '"refresh" is not set up: pick what runs it in the settings window',
});

check("ICommand.of declares a command over its schema", declarationIn(ICommand.of(SubscribeSchema))?.kind, "command");
check("a bare ICommand is a command that takes nothing", declarationIn(ICommand)?.kind, "command");

const manifest = manifestOfModule({
	default: Billing,
	metadata: { title: "Billing", description: "Plans", props: { subscribe: { label: "Subscribe" } } },
	layout: { role: "content", size: { preferredWidth: 320, preferredHeight: "auto" } },
});
check(
	"commands reach the manifest beside props, not inside them",
	[Object.keys(manifest?.props ?? {}), manifest?.["commands"]],
	[["subscriptions"], { subscribe: { label: "Subscribe" }, refresh: { label: "refresh" } }],
);

console.log(`\n${failed === 0 ? "commands: clean" : `commands: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
