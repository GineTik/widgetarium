import { createContext, useContext } from "react";
import type { Context } from "react";

export interface TabsState {
	readonly value: string | undefined;
	readonly setValue: (value: string) => void;
	readonly idOf: (value: string, part: "trigger" | "content") => string;
}

export const TabsContext: Context<TabsState | null> = createContext<TabsState | null>(null);

export function useTabs(): TabsState {
	const tabs = useContext(TabsContext);
	if (!tabs) throw new Error("a tabs part stands outside Tabs");
	return tabs;
}
