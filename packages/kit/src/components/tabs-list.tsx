import { Children, createElement as h } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactElement } from "react";
import { useSegmentedThumb } from "../hooks/use-segmented-thumb";
import { cn } from "../utils/cn";
import { ACROSS_STEP_OF_KEY, stepIndex } from "../utils/roving";
import { useTabs } from "./tabs-context";

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
	readonly size?: "s" | "m" | "l" | undefined;
}

const ENABLED_TAB = '[role="tab"]:not([disabled])';

export function TabsList({ size = "m", className, children, ...rest }: TabsListProps): ReactElement {
	const { value } = useTabs();
	const { listRef, thumbProps } = useSegmentedThumb(value, Children.count(children));
	return (
		<div
			role="tablist"
			data-slot="tabs-list"
			aria-orientation="horizontal"
			{...rest}
			ref={listRef}
			className={cn("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", className)}
			onKeyDown={(event) => {
				rest.onKeyDown?.(event);
				pressesNextTab(event);
			}}
		>
			<span {...thumbProps} />
			{children}
		</div>
	);
}

function pressesNextTab(event: KeyboardEvent<HTMLDivElement>): void {
	const step = ACROSS_STEP_OF_KEY.get(event.key);
	if (step === undefined) return;
	const tabs = [...event.currentTarget.querySelectorAll<HTMLElement>(ENABLED_TAB)];
	const at = tabs.findIndex((tab) => tab === document.activeElement);
	const next = tabs[stepIndex(at, step, tabs.length)];
	if (!next) return;
	event.preventDefault();
	next.focus();
	next.click();
}
