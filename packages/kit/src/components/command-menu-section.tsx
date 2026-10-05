import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CommandMenuSectionProps {
	readonly title?: string | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function CommandMenuSection({ title, children, className: cls }: CommandMenuSectionProps): ReactElement {
	return (
		<section className={cn("wg-kit-command-section", cls)} aria-label={title}>
			{title ? <h3>{title}</h3> : null}
			{children}
		</section>
	);
}
