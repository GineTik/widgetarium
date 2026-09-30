import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { useSelect } from "./select-context";

export interface SelectValueProps {
	readonly placeholder?: ReactNode;
	readonly className?: string | undefined;
}

export function SelectValue({ placeholder, className: cls }: SelectValueProps): ReactElement {
	const { selected, labels } = useSelect();
	const isChosen = labels.has(selected);
	return (
		<span className={cn("wg-kit-select-value", cls)} data-placeholder={isChosen ? undefined : ""}>
			{isChosen ? labels.get(selected) : placeholder}
		</span>
	);
}
