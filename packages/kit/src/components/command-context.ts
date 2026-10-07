import { createContext, useContext } from "react";
import type { Context } from "react";

export interface CommandState {
	readonly search: string;
	readonly setSearch: (search: string) => void;
	readonly shouldFilter: boolean;
	readonly isEmpty: boolean;
}

export const CommandContext: Context<CommandState | null> = createContext<CommandState | null>(null);

export function useCommand(): CommandState {
	const command = useContext(CommandContext);
	if (!command) throw new Error("a command part stands outside a Command");
	return command;
}
