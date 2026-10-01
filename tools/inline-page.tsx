import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { InlineWidget, HOST_CLASS } from "../apps/obsidian/src/inline-render.js";
import { manifestOf } from "../packages/core/src/engine/catalogue-index.js";
import type { EngineManifest } from "../packages/core/src/engine/catalogue-index.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { NO_HOST } from "../packages/core/src/engine/host-none.js";
import type { HostClaimingNothing } from "../packages/core/src/engine/host-none.js";
import type { PassageReader } from "../packages/core/src/gateway/host.js";
import CodeBlock from "../registry/@default/code-block/widget.tsx";
import card from "../registry/@default/code-block/manifest.generated.json";

const CODE_BLOCK_ID = "@default/code-block";
const PREVIEWED_FILE = "main.py";

const manifest = manifestOf({ ...card, id: CODE_BLOCK_ID }, CodeBlock);

function previewedFileOf(manifested: EngineManifest): string {
	const preview = manifested["preview"];
	const files = isObject(preview) ? preview["files"] : null;
	const file = isObject(files) ? files[PREVIEWED_FILE] : null;
	return typeof file === "string" ? file : "";
}

const FILE = previewedFileOf(manifest);

function paintObsidianFence(element: HTMLElement, markdown: string): () => void {
	element.textContent = "";
	const lines = String(markdown).split("\n");
	const language = (lines[0] ?? "").replace(/^`+/, "");
	const pre = document.createElement("pre");
	const code = document.createElement("code");
	code.className = `language-${language} is-loaded`;
	code.textContent = `${lines.slice(1, -1).join("\n")}\n`;
	pre.appendChild(code);
	const copy = document.createElement("button");
	copy.className = "copy-code-button";
	copy.textContent = "Copy";
	pre.appendChild(copy);
	element.appendChild(pre);
	return () => {};
}

const host: HostClaimingNothing = {
	...NO_HOST,
	can: { renderMarkdown: true },
	ui: { notify() {}, renderMarkdown: paintObsidianFence },
};

const reader: PassageReader = {
	canRead: true,
	async read() {
		return { ok: true, text: FILE, path: PREVIEWED_FILE, bytes: new TextEncoder().encode(FILE).length, failure: null };
	},
};

const note = document.getElementById("note");
if (!note) throw new Error("inline page: the page has no #note");
const mount = document.createElement("div");
mount.className = HOST_CLASS;
note.appendChild(mount);

render(
	h(InlineWidget, {
		definition: { component: CodeBlock, manifest },
		here: {
			of: "passage",
			content: PREVIEWED_FILE,
			canUpdate: false,
			get: async () => null,
			update: async () => false,
		},
		navigator: null,
		host,
		reader,
		raw: "!code main.py",
	}),
	mount,
);
