import fs from "node:fs";
import path from "node:path";
import { differences, propsAsTheEngineResolvesThem, propsOfEveryShippedWidget } from "./widget-props.mjs";
import { WIDGETS_AT } from "./harness.mjs";

let failed = 0;
let checks = 0;
function check(name, complaints) {
	checks += 1;
	if (complaints.length === 0) {
		console.log(`OK  ${name}`);
		return;
	}
	failed += 1;
	console.log(`!!  ${name}`);
	for (const line of complaints) console.log(`      ${line}`);
}

const FROZEN = "tools/widget-props.json";
const frozen = JSON.parse(fs.readFileSync(FROZEN, "utf8"));
const resolved = await propsOfEveryShippedWidget();

check(
	`every widget the engine loaded is written in ${FROZEN}`,
	differences(Object.keys(frozen), Object.keys(resolved), ["widgets"]),
);

for (const [id, wanted] of Object.entries(frozen)) {
	check(
		`${id}: the engine resolves the props it was declaring before they moved`,
		differences(wanted, resolved[id] ?? null, [id]),
	);
}

function manifestsStillDeclaringProps() {
	const found = [];
	for (const scope of fs.readdirSync("registry").filter((name) => name.startsWith("@"))) {
		for (const folder of fs.readdirSync(path.join("registry", scope))) {
			const at = path.join("registry", scope, folder, "manifest.json");
			if (!fs.existsSync(at)) continue;
			if (JSON.parse(fs.readFileSync(at, "utf8")).props)
				found.push(`${at}: props belong beside the component that reads them`);
		}
	}
	return found;
}

check("no shipped manifest declares props — the catalogue record carries none", manifestsStillDeclaringProps());

const MANIFEST_ONLY = {
	[`${WIDGETS_AT}/@old/dial/manifest.json`]: JSON.stringify({
		id: "@old/dial",
		api: 1,
		title: "Dial",
		props: { hours: { kind: "value", type: "number", label: "Hours", verbs: { get: "required" } } },
	}),
	[`${WIDGETS_AT}/@old/dial/widget.tsx`]: `import { createWidget } from "widgetarium";
export default createWidget(function Dial() {
	return <b>dial</b>;
});
`,
};

const DECLARING = {
	[`${WIDGETS_AT}/@old/dial/manifest.json`]: MANIFEST_ONLY[`${WIDGETS_AT}/@old/dial/manifest.json`],
	[`${WIDGETS_AT}/@old/dial/widget.tsx`]: `import { createWidget } from "widgetarium";
export default createWidget(function Dial() {
	return <b>dial</b>;
}, { props: { hours: { label: "Hours kept" }, minutes: { kind: "value", type: "number", label: "Minutes", verbs: { get: "required" } } } });
`,
};

const SYMLINKED = {
	[`${WIDGETS_AT}/@old/tabs/manifest.json`]: JSON.stringify({ id: "@old/tabs", api: 1, title: "Tabs" }),
	[`${WIDGETS_AT}/@old/tabs/widget.tsx`]: `import { createWidget } from "widgetarium";
export default createWidget(function Tabs() {
	return <b>tabs</b>;
}, { props: { tabs: { label: "Tabs", default: { value: [] } }, label: { type: "line", label: "Label field", default: { value: "name" } } } });
`,
};

check(
	"a widget read straight from its folder, with no kind written, still resolves a line as a value",
	differences(
		{
			tabs: {
				kind: "collection",
				label: "Tabs",
				writes: ["list", "get", "create", "update", "remove"],
				default: { rows: [] },
			},
			label: {
				kind: "value",
				control: "line",
				type: "line",
				label: "Label field",
				writes: ["get"],
				default: { value: "name" },
			},
		},
		(await propsAsTheEngineResolvesThem(SYMLINKED))["@old/tabs"],
		["@old/tabs"],
	),
);

check(
	"a vault whose manifest still carries props keeps answering with them",
	differences(
		{ hours: { kind: "value", control: "number", type: "number", label: "Hours", writes: ["get"] } },
		(await propsAsTheEngineResolvesThem(MANIFEST_ONLY))["@old/dial"],
		["@old/dial"],
	),
);

check(
	"a declaration in the code stands over the props the record carries, key by key",
	differences(
		{
			hours: { kind: "value", control: "number", type: "number", label: "Hours kept", writes: ["get"] },
			minutes: { kind: "value", control: "number", type: "number", label: "Minutes", writes: ["get"] },
		},
		(await propsAsTheEngineResolvesThem(DECLARING))["@old/dial"],
		["@old/dial"],
	),
);

console.log(failed ? `props gate: ${failed} of ${checks} checks red` : `props gate: clean, ${checks} checks`);
if (failed) process.exit(1);
