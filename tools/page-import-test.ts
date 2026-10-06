import { createElement as h } from "react";
import { fakeVault } from "./fake-vault.ts";
import { layJsdomGlobals } from "./jsdom-globals.ts";

layJsdomGlobals();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { WidgetRegistry } = await import("../packages/core/src/registry.js");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const CARD = `import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";

const Card = createWidget({
	inject: { getName: IQuery.expects(z.string()) },
	draw: ({ getName: name }) => <b className="card">{name}</b>,
});

export const metadata = defineMetadata(Card, { title: "Card", description: "A name.", props: { getName: { label: "Name" } } });
export const layout = defineLayout({ role: "detail", size: { preferredWidth: 320, preferredHeight: "auto" } });
export default Card;
`;

const PAGE = `import { createWidget, defineLayout, defineMetadata } from "widgetarium";
import Card from "@crm/card";

const Page = createWidget({
	draw: () => (
		<main className="page">
			<Card getName="Ada" />
			<Card getName="Grace" />
		</main>
	),
});

export const metadata = defineMetadata(Page, { title: "Page", description: "People.", props: {} });
export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });
export default Page;
`;

const vault = fakeVault();
for (const folder of [
	".widgetarium",
	".widgetarium/widgets",
	".widgetarium/widgets/@crm",
	".widgetarium/widgets/@crm/card",
	".widgetarium/widgets/@crm/page",
])
	await vault.mkdir(folder);
await vault.write(".widgetarium/widgets/@crm/card/widget.tsx", CARD);
await vault.write(".widgetarium/widgets/@crm/page/widget.tsx", PAGE);
const registry = new WidgetRegistry({ vault: { adapter: vault } });
await registry.load();

const page = registry.get("@crm/page");
check("a page that imports another widget by its id loads", page?.error ?? null, null);
check("and the engine records which widgets it uses", page?.uses, ["@crm/card"]);

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
const Drawn = page?.component;
if (Drawn) await act(async () => root.render(h(Drawn, {})));
check(
	"drawn, the page draws the imported widget as an ordinary component fed a plain value",
	[...host.querySelectorAll("main.page b.card")].map((node) => node.textContent),
	["Ada", "Grace"],
);
await act(async () => root.unmount());

console.log(`\n${failed === 0 ? "page imports: clean" : `page imports: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
