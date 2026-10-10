import { createElement as h, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

export interface AgentLook {
	readonly app: string;
	readonly page: string;
	readonly frame: string;
}

const LINGERS_MS = 8000;
const LOOKING_AT_PAGE = "Agent is looking at {where}";
const LOOKING_AT_DESIGN = "Agent is looking at the whole design";
const GO_THERE = "Go to the page the agent is looking at";
const listeners = new Set<() => void>();
let lookNow: AgentLook | null = null;
let fading = 0;

export async function whileAgentLooks<T>(look: AgentLook, work: () => Promise<T>): Promise<T> {
	window.clearTimeout(fading);
	lookedAt(look);
	try {
		const done = await work();
		fading = window.setTimeout(() => lookedAt(null), LINGERS_MS);
		return done;
	} catch (failure) {
		lookedAt(null);
		throw failure;
	}
}

export function AgentLookChip({
	app,
	onPage,
}: {
	readonly app: string;
	readonly onPage: (page: string) => void;
}): ReactElement | null {
	const look = useSyncExternalStore(subscribe, () => lookNow);
	if (look?.app !== app) return null;
	const icon = h(Icon, { key: "icon", name: "sparkles", size: 14 });
	if (!look.page) return h(Button, { size: "s", variant: "ghost" }, [icon, LOOKING_AT_DESIGN]);
	const where = look.frame ? `${look.page} · ${look.frame}` : look.page;
	return h(Button, { size: "s", variant: "ghost", title: GO_THERE, onClick: () => onPage(look.page) }, [
		icon,
		LOOKING_AT_PAGE.replace("{where}", where),
	]);
}

function lookedAt(look: AgentLook | null): void {
	lookNow = look;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
