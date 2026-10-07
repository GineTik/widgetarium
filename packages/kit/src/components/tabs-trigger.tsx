import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { useTabs } from "./tabs-context";

export interface TabsTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	readonly value: string;
}

export function TabsTrigger({ value, ...rest }: TabsTriggerProps): ReactElement {
	const tabs = useTabs();
	const isActive = tabs.value === value;
	return (
		<button
			type="button"
			role="tab"
			data-slot="tabs-trigger"
			{...rest}
			id={tabs.idOf(value, "trigger")}
			aria-controls={tabs.idOf(value, "content")}
			aria-selected={isActive}
			data-state={isActive ? "active" : "inactive"}
			tabIndex={isActive ? 0 : -1}
			onClick={(event) => {
				rest.onClick?.(event);
				tabs.setValue(value);
			}}
		/>
	);
}
