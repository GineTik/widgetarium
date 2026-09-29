import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { widgetTypeFiles } from "./widget-types.mjs";

const laid = fs.mkdtempSync(path.join(os.tmpdir(), "wg-vault-"));
for (const [name, text] of Object.entries(widgetTypeFiles())) {
	fs.mkdirSync(path.join(laid, path.dirname(name)), { recursive: true });
	fs.writeFileSync(path.join(laid, name), text);
}
fs.mkdirSync(path.join(laid, "@you/checklist"), { recursive: true });

const said = (at) => {
	try {
		execFileSync("npx", ["--no-install", "tsc", "-p", path.join(at, "tsconfig.json")], {
			encoding: "utf8",
			stdio: "pipe",
		});
		return "";
	} catch (failure) {
		return `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
	}
};

let failures = 0;

function check(name, held, wanted) {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${held}`}`);
}

const DECLARED = `import { ICrudGateway, IValueGateway, createWidget, defineLayout, defineMetadata, defineProps, useData, z } from "widgetarium";

const Entry = z.object({ title: z.string(), done: z.boolean().optional() });

const props = defineProps({
	heading: IValueGateway.of(z.string().default("To do")).pick("get"),
	entries: ICrudGateway.of(Entry).pick("list", "create"),
});

export const metadata = defineMetadata(props, {
	title: "Checklist",
	description: "The widget a vault is measured on.",
	props: { heading: { label: "Heading" } },
});

export const layout = defineLayout({ size: { preferredWidth: "full", preferredHeight: "auto" } });

export default createWidget({
	inject: props,
	draw: ({ heading, entries }) => {
		const { data } = useData(entries.list);
		return <div>{heading.toUpperCase() + data.map((entry) => entry.title + entry.ref).join("")}</div>;
	},
});
`;

fs.writeFileSync(path.join(laid, "@you/checklist/widget.tsx"), DECLARED);
check("a widget declaring its props as gateways typechecks against the laid types", said(laid).trim(), "");

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	DECLARED.replace("heading.toUpperCase()", "heading.toFixed()"),
);
check("and a value its schema types as a string is not a number", said(laid).includes("error TS2551"), true);

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	DECLARED.replace('props: { heading: { label: "Heading" } }', 'props: { headline: { label: "Heading" } }'),
);
check("and metadata naming a prop nobody declared is refused", said(laid).includes("error TS2561"), true);

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	DECLARED.replace('preferredWidth: "full"', 'preferredWidth: "wide"'),
);
check(
	"and a layout asking for a width the engine has no word for is refused",
	said(laid).includes("error TS2322"),
	true,
);

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	DECLARED.replace('heading: IValueGateway.of(z.string().default("To do")).pick("get"),', 'heading: "To do",'),
);
check(
	"and a prop that is not a gateway is refused on its own line, naming what belongs there",
	said(laid).includes("error TS2322: Type 'string' is not assignable to type 'WidgetProp'"),
	true,
);

fs.rmSync(laid, { recursive: true, force: true });
console.log(failures === 0 ? "vault types: every check passed" : `vault types: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
