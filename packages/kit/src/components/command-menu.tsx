import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { focusStepped } from "../utils/focus-step";
import { UP_DOWN_STEP_OF_KEY } from "../utils/roving";

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
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)];
	focusStepped(event, items, UP_DOWN_STEP_OF_KEY.get(event.key));
}
