import type { ViewHost } from "widgetarium";
import { proseOf } from "./prose-of";
import { RenderedMarkdown } from "./rendered-markdown";
import type { ProseSource } from "./types";

export function Prose({ host, source }: { host: ViewHost; source: ProseSource }) {
	const markdown = proseOf(source);
	if (!markdown) return null;
	return <RenderedMarkdown host={host} markdown={markdown} path={pathOf(source)} />;
}

function pathOf(source: ProseSource) {
	if (typeof source !== "object") return null;
	return source?.path ?? null;
}
