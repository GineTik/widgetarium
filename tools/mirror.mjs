// package.json says commonjs, so the ES sources need an .mjs mirror to be imported directly
import fs from "node:fs";
import path from "node:path";

export function buildMirror() {
	const cache = path.join(process.cwd(), "tools", ".mjs-cache");
	fs.rmSync(cache, { recursive: true, force: true });
	fs.mkdirSync(cache, { recursive: true });
	for (const file of fs.readdirSync("src").filter((name) => name.endsWith(".js"))) {
		const body = fs.readFileSync(path.join("src", file), "utf8").replace(/from "\.\/([\w-]+)\.js"/g, 'from "./$1.mjs"');
		fs.writeFileSync(path.join(cache, file.replace(/\.js$/, ".mjs")), body);
	}
	return "./.mjs-cache";
}
