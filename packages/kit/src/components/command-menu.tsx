import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CommandMenuProps {
	readonly label?: string | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

const ITEM = "[data-command-item]";

export function CommandMenu({ label, children, className: cls }: CommandMenuProps): ReactElement {
	return (
		<div className={cn("wg-kit-command", cls)} role="dialog" aria-label={label} onKeyDown={movesBetweenItems}>
			{children}
		</div>
	);
}

function movesBetweenItems(event: KeyboardEvent<HTMLDivElement>): void {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)];
	if (items.length === 0) return;
	event.preventDefault();
	const at = items.findIndex((item) => item === document.activeElement);
	const step = event.key === "ArrowDown" ? 1 : -1;
	items[(at + step + items.length) % items.length]?.focus();
}
