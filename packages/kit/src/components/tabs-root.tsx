import { createElement as h, useId } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";
import { TabsContext } from "./tabs-context";

export interface TabsRootProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly orientation?: "horizontal" | "vertical" | undefined;
}

export function TabsRoot({
	value,
	defaultValue,
	onValueChange,
	orientation = "horizontal",
	className,
	children,
	...rest
}: TabsRootProps): ReactElement {
	const [current, setCurrent] = useControllableState<string | undefined>({
		prop: value,
		defaultProp: defaultValue,
		onChange: (next) => next !== undefined && onValueChange?.(next),
	});
	const baseId = useId();
	const idOf = (tab: string, part: "trigger" | "content"): string => `${baseId}-${part}-${tab}`;
	return (
		<TabsContext.Provider value={{ value: current, setValue: setCurrent, idOf }}>
			<div
				data-slot="tabs"
				data-orientation={orientation}
				{...rest}
				className={cn("wg-kit-tabs", orientation === "vertical" && "is-vertical", className)}
			>
				{children}
			</div>
		</TabsContext.Provider>
	);
}
