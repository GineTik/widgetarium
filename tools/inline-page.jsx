import { h, render } from "preact";
import { InlineWidget, HOST_CLASS } from "../src/inline-render.js";
import CodeBlock from "../widgets/@inline/code-block/widget.jsx";
import manifest from "../widgets/@inline/code-block/manifest.json";

const FILE = manifest.preview.files["main.py"];

// CONTEXT: Obsidian's fence markup — pre > code.language-x, value plus one newline, copy button appended
function paintFence(element, markdown) {
	element.textContent = "";
	const lines = String(markdown).split("\n");
	const language = lines[0].replace(/^`+/, "");
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

const host = {
	can: { renderMarkdown: true },
	ui: { notify() {}, renderMarkdown: paintFence },
};

const reader = {
	canRead: true,
	async read() {
		return { ok: true, text: FILE, path: "main.py" };
	},
};

const mount = document.createElement("div");
mount.className = HOST_CLASS;
document.getElementById("note").appendChild(mount);

render(
	h(InlineWidget, {
		definition: { component: CodeBlock, manifest },
		here: { of: "passage", content: "main.py", canUpdate: false, update: async () => false },
		navigator: null,
		host,
		reader,
		raw: "!code main.py",
	}),
	mount,
);
