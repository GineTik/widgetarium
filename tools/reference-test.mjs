import esbuild from "esbuild";

const built = await esbuild.build({
	stdin: {
		contents: `export * from "./src/ref-draft.js";`,
		resolveDir: process.cwd(),
		loader: "js",
	},
	bundle: true,
	write: false,
	format: "esm",
	platform: "neutral",
	logLevel: "silent",
});
const held = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);

let failed = 0;
function check(name, ok, detail = "") {
	if (ok) {
		console.log(`ok   ${name}`);
		return;
	}
	failed += 1;
	console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const { referenceIn, referenceText, boxNamed } = held;

const OFFERED = [
	{ ref: "filter/openByDefault", tile: "filter", prop: "openByDefault", label: "Open by default", title: "Filter" },
	{ ref: "tabs/selection", tile: "tabs", prop: "selection", label: "Selected tab", title: "Editable tabs" },
	{ ref: "tabs/labelField", tile: "tabs", prop: "labelField", label: "Label field", title: "Editable tabs" },
];

check("text: plain text is not a reference", referenceIn("Widgetarium") === null);
check("text: an empty draft is not a reference", referenceIn("") === null);
check("text: text that merely mentions braces later is not a reference", referenceIn("Text {{filter.openByDefault}}") === null);

check("typing: opening the braces asks for a widget", JSON.stringify(referenceIn("{{")) === JSON.stringify({ tile: null, needle: "" }));
check("typing: a partial widget name is a needle, not a tile", JSON.stringify(referenceIn("{{fil")) === JSON.stringify({ tile: null, needle: "fil" }));
check("typing: the dot moves the question to the fields", JSON.stringify(referenceIn("{{filter.")) === JSON.stringify({ tile: "filter", needle: "" }));
check("typing: a partial field is a needle under its widget", JSON.stringify(referenceIn("{{filter.open")) === JSON.stringify({ tile: "filter", needle: "open" }));
check("typing: a closed reference reads the same as an open one", JSON.stringify(referenceIn("{{filter.openByDefault}}")) === JSON.stringify({ tile: "filter", needle: "openByDefault" }));

check("writing: a widget alone is written with its dot waiting", referenceText("filter") === "{{filter.}}");
check("writing: a field completes it", referenceText("filter", "openByDefault") === "{{filter.openByDefault}}");

check("pointing: a written reference finds the box it names", boxNamed(OFFERED, referenceIn("{{tabs.selection}}"))?.ref === "tabs/selection");
check("pointing: a widget with no field yet points at nothing", boxNamed(OFFERED, referenceIn("{{tabs.")) === null);
check("pointing: a widget nobody has points at nothing", boxNamed(OFFERED, referenceIn("{{filter1.something}}")) === null);
check("pointing: a field that widget does not offer points at nothing", boxNamed(OFFERED, referenceIn("{{filter.selection}}")) === null);

{
	const said = referenceIn("{{tabs.");
	const fields = OFFERED.filter((entry) => entry.tile === said.tile);
	check("completion: a widget's own fields are what comes after its dot", fields.map((entry) => entry.prop).join(",") === "selection,labelField");
}

{
	const widgets = [...new Map(OFFERED.map((entry) => [entry.tile, entry])).values()];
	check("completion: each widget is offered once, not once per field", widgets.map((entry) => entry.tile).join(",") === "filter,tabs");
}

console.log(failed ? `reference gate: ${failed} failure(s)` : "reference gate: clean");
process.exit(failed ? 1 : 0);
