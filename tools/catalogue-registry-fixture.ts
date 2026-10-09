import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { z } from "zod";

export const MINI_DEPENDENCY = "date-fns";

const REGISTRY = path.resolve(import.meta.dirname, "../registry");
const LOG_STAT = "@default/log-stat";
const CardSchema = z.record(z.string(), z.unknown());

export function miniRegistry(into: string): string {
	const scope = path.join(into, "@mini");
	fs.mkdirSync(path.join(scope, "log-stat"), { recursive: true });
	fs.copyFileSync(path.join(REGISTRY, "@default/lib.ts"), path.join(scope, "lib.ts"));
	const widget = fs.readFileSync(path.join(REGISTRY, LOG_STAT, "widget.tsx"), "utf8");
	fs.writeFileSync(path.join(scope, "log-stat/widget.tsx"), widget.replaceAll('"@default/lib"', '"../lib"'));
	const card = CardSchema.parse(
		JSON.parse(fs.readFileSync(path.join(REGISTRY, LOG_STAT, "manifest.generated.json"), "utf8")),
	);
	const dependencies = { [MINI_DEPENDENCY]: "^4.1.0", zod: "^4.6.5" };
	fs.writeFileSync(path.join(scope, "log-stat/manifest.generated.json"), JSON.stringify({ ...card, dependencies }));
	const registry = { registry: 1, name: "Mini", scope: "@mini", widgets: [{ name: "log-stat" }] };
	fs.writeFileSync(path.join(into, "widgetarium-registry.json"), JSON.stringify(registry));
	return into;
}

export async function servedFolder(root: string): Promise<http.Server> {
	const server = http.createServer((request, response) => {
		const file = path.join(root, decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname));
		const isInside = file.startsWith(`${root}${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isFile();
		response.writeHead(isInside ? 200 : 404);
		response.end(isInside ? fs.readFileSync(file) : "");
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	return server;
}
