import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useTabs } from "./tabs-context";

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly value: string;
}

export function TabsContent({ value, className, ...rest }: TabsContentProps): ReactElement | null {
	const tabs = useTabs();
	if (tabs.value !== value) return null;
	return (
		<div
			role="tabpanel"
			data-slot="tabs-content"
			data-state="active"
			{...rest}
			id={tabs.idOf(value, "content")}
			aria-labelledby={tabs.idOf(value, "trigger")}
			className={cn("wg-kit-tabs-content", className)}
		/>
	);
}
