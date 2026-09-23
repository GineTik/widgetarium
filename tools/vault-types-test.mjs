import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { widgetTypeFiles } from "./widget-types.mjs";

const WIDGET = `import { createWidget, defineManifest, defineProp, useData } from "widgetarium";

type Entry = { title: string; done?: boolean };

export const manifest = defineManifest({ size: { preferredWidth: "full", preferredHeight: "auto" }, 
	title: "Checklist",
	description: "The widget a vault is measured on.",
	props: {
		heading: defineProp<string>()({ default: "To do" }),
		entries: defineProp<Entry[]>()({ default: [], writes: ["create"] }),
	},
});

export default createWidget(manifest, ({ heading, entries }) => {
	const { data } = useData(entries.list);
	const said = String(useData(heading.get).data ?? "");
	return <div>{said + data.map((entry) => entry.title + entry.ref).join("")}</div>;
});
`;

const REFUSED = `import { defineManifest, defineProp } from "widgetarium";

export const manifest = defineManifest({ size: { preferredWidth: "full", preferredHeight: "auto" }, 
	title: "Refused",
	description: "A verb nobody declared.",
	props: { entries: defineProp<{ title: string }[]>()({ default: [] }) },
});
`;

const laid = fs.mkdtempSync(path.join(os.tmpdir(), "wg-vault-"));
for (const [name, text] of Object.entries(widgetTypeFiles())) {
	fs.mkdirSync(path.join(laid, path.dirname(name)), { recursive: true });
	fs.writeFileSync(path.join(laid, name), text);
}
fs.mkdirSync(path.join(laid, "@you/checklist"), { recursive: true });
fs.writeFileSync(path.join(laid, "@you/checklist/widget.tsx"), WIDGET);

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

check("a widget written in the vault typechecks against the laid types", said(laid).trim(), "");

fs.writeFileSync(
	path.join(laid, "@you/checklist/widget.tsx"),
	`${REFUSED}\nexport const removing = manifest.props.entries;\nconst refused: number = removing;\n`,
);
const refusal = said(laid);
check("and the laid types still refuse what the engine refuses", refusal.includes("error TS2322"), true);

fs.rmSync(laid, { recursive: true, force: true });
console.log(failures === 0 ? "vault types: every check passed" : `vault types: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
