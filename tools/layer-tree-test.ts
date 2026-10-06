import { layJsdomGlobals } from "./jsdom-globals.ts";

layJsdomGlobals();
const { layersIn } = await import("../apps/obsidian/src/layer-tree.ts");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const root = document.createElement("div");
root.innerHTML = `
	<div class="wg-kit-page" data-wg-node="widget.tsx:10">
		<header class="kit-only"><h1>People</h1></header>
		<div data-wg-node="widget.tsx:40" data-name="Main" style="display:flex;flex-direction:column">
			<div data-wg-widget="@crm/reach-out" data-wg-node="widget.tsx:60" style="display:contents">
				<ul data-wg-node="reach-out.tsx:5"><li>inside</li></ul>
			</div>
			<span data-wg-node="widget.tsx:90">See all</span>
			<span data-wg-node="widget.tsx:90">See all</span>
		</div>
		<aside data-wg-node="widget.tsx:120" style="display:flex"><input data-wg-node="widget.tsx:130" /></aside>
	</div>`;

const layers = layersIn(root);
const flat = (
	list: readonly { mark: string; kind: string; name: string; repeats: number; children: readonly unknown[] }[],
): string[] =>
	list.flatMap((layer) => [
		`${layer.kind}:${layer.name}${layer.repeats > 1 ? `×${layer.repeats}` : ""}`,
		...flat(layer.children as typeof list).map((line) => `  ${line}`),
	]);
check("the tree holds only what the page's own code marked, kit insides dissolved", flat(layers), [
	"group:Group",
	"  column:Main",
	"    widget:@crm/reach-out",
	"    text:Text×2",
	"  row:Row",
	"    input:Field",
]);
check("a widget is a leaf: nothing inside it is listed", layers[0]?.children[0]?.children[0]?.children.length, 0);
check("a node carries the mark the code is moved by", layers[0]?.children[0]?.children[0]?.mark, "widget.tsx:60");

console.log(`\n${failed === 0 ? "layer tree: clean" : `layer tree: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
