import { useLayoutEffect } from "react";
import { useCommand } from "../components/command-context";

export interface CommandSearch {
	readonly search: string;
	readonly setSearch: (search: string) => void;
}

export function useCommandSearch(asked: string | undefined): CommandSearch {
	const { search, setSearch } = useCommand();
	useLayoutEffect(() => {
		if (asked !== undefined && asked !== search) setSearch(asked);
	}, [asked]);
	return { search: asked ?? search, setSearch };
}
