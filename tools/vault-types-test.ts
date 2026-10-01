import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { widgetTypeFiles } from "./widget-types.mts";
import { isObject } from "../packages/core/src/engine/is-object.js";

const laid = fs.mkdtempSync(path.join(os.tmpdir(), "wg-vault-"));
for (const [name, text] of Object.entries(widgetTypeFiles())) {
	fs.mkdirSync(path.join(laid, path.dirname(name)), { recursive: true });
	fs.writeFileSync(path.join(laid, name), text);
}
fs.mkdirSync(path.join(laid, "@you/checklist"), { recursive: true });

const outputOf = (failure: unknown, stream: string): unknown => (isObject(failure) ? failure[stream] : undefined);

const said = (at: string, ...options: string[]): string => {
	try {
		execFileSync("npx", ["--no-install", "tsc", "-p", path.join(at, "tsconfig.json"), ...options], {
			encoding: "utf8",
			stdio: "pipe",
		});
		return "";
	} catch (failure) {
		return `${outputOf(failure, "stdout") ?? ""}${outputOf(failure, "stderr") ?? ""}`;
	}
};

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
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

fs.writeFileSync(
	path.join(laid, "@you/lib.ts"),
	"export const shoutOf = (text: string): string => text.toUpperCase();\n",
);
const IMPORTING_THE_LIB = `import { shoutOf } from "@you/lib";\n${DECLARED}`.replace(
	"heading.toUpperCase()",
	"shoutOf(heading)",
);
fs.writeFileSync(path.join(laid, "@you/checklist/widget.tsx"), IMPORTING_THE_LIB);
check("a widget importing its scope's lib.ts typechecks against it", said(laid).trim(), "");

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	IMPORTING_THE_LIB.replace("shoutOf(heading)", "shoutOf(heading).toFixed()"),
);
check("and what the lib returns is typed, not any", said(laid).includes("error TS2551"), true);

const DRAWING_WITH_THE_KIT = `import { useState } from "react";
import { createPortal } from "react-dom";
import { createWidget } from "widgetarium";
import { Button, Pill } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";

export default createWidget({
	draw: () => {
		const [count, setCount] = useState(0);
		return (
			<div>
				<Pill tone="success">{count}</Pill>
				<Emoji name="smiling-face-with-halo" />
				<Button onClick={() => setCount(count + 1)}>More</Button>
				{createPortal(<span />, document.body)}
			</div>
		);
	},
});
`;
fs.writeFileSync(path.join(laid, "@you/checklist/widget.tsx"), DRAWING_WITH_THE_KIT);
check("a widget drawing with the kit, React and react-dom typechecks against the laid types", said(laid).trim(), "");
check(
	"and every module a laid declaration imports was laid too",
	said(laid, "--skipLibCheck", "false").includes("error TS2307"),
	false,
);

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	DRAWING_WITH_THE_KIT.replace('tone="success"', 'tone="loud"'),
);
check(
	"and the kit is typed, not any: a tone the kit has no word for is refused",
	said(laid).includes("error TS2322"),
	true,
);

fs.writeFileSync(path.join(laid, "@you/checklist/widget.tsx"), DRAWING_WITH_THE_KIT);
const REACT_LAID_AT = path.join(laid, "types/node_modules/@types/react");
fs.renameSync(REACT_LAID_AT, `${REACT_LAID_AT}-gone`);
check("and without the laid React types the same widget does not compile", said(laid).includes("error TS2307"), true);
fs.renameSync(`${REACT_LAID_AT}-gone`, REACT_LAID_AT);

fs.rmSync(laid, { recursive: true, force: true });
console.log(failures === 0 ? "vault types: every check passed" : `vault types: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
