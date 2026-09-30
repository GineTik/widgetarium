import { useState } from "react";
import { tabStripVerbsOf } from "./tab-strip-verbs.js";
import type { TabStripFacts, TabStripVerbs } from "./tab-strip-verbs.js";

export interface TabStrip extends TabStripFacts, TabStripVerbs {
	readonly editing: string;
	readonly setEditing: (tab: string) => void;
	readonly isMenuOpen: boolean;
	readonly setMenuOpen: (isOpen: boolean) => void;
	readonly isArchiveShown: boolean;
	readonly setArchiveShown: (isShown: boolean) => void;
	readonly deleting: string;
	readonly setDeleting: (tab: string) => void;
}

export function useTabStrip(facts: TabStripFacts): TabStrip {
	const [editing, setEditing] = useState("");
	const [isMenuOpen, setMenuOpen] = useState(false);
	const [isArchiveShown, setArchiveShown] = useState(false);
	const [deleting, setDeleting] = useState("");
	return {
		...facts,
		...tabStripVerbsOf(facts, { setEditing, setDeleting }),
		editing,
		setEditing,
		isMenuOpen,
		setMenuOpen,
		isArchiveShown,
		setArchiveShown,
		deleting,
		setDeleting,
	};
}
