import { createElement as h, useId } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { openedList, stepKeysOf, toggledOpen } from "../utils/accordion";
import { cn } from "../utils/cn";
import { focusStepped, ownedBy } from "../utils/focus-step";
import { AccordionContext } from "./accordion-context";

export { AccordionItem } from "./accordion-item";
export { AccordionTrigger } from "./accordion-trigger";
export { AccordionContent } from "./accordion-content";
export type { AccordionItemProps } from "./accordion-item";
export type { AccordionTriggerProps } from "./accordion-trigger";
export type { AccordionContentProps } from "./accordion-content";

interface AccordionBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> {
	readonly disabled?: boolean | undefined;
	readonly orientation?: "vertical" | "horizontal" | undefined;
	readonly dir?: "ltr" | "rtl" | undefined;
}

export interface AccordionSingleProps extends AccordionBaseProps {
	readonly type?: "single" | undefined;
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly collapsible?: boolean | undefined;
}

export interface AccordionMultipleProps extends AccordionBaseProps {
	readonly type: "multiple";
	readonly value?: readonly string[] | undefined;
	readonly defaultValue?: readonly string[] | undefined;
	readonly onValueChange?: ((value: string[]) => void) | undefined;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

const TRIGGER = "[data-slot='accordion-trigger']:not([disabled])";
const ROOT = "[data-slot='accordion']";

export function Accordion(props: AccordionProps): ReactElement {
	const { type, value, defaultValue, onValueChange, disabled = false, orientation = "vertical", ...rest } = props;
	const isMultiple = type === "multiple";
	const isCollapsible = !isMultiple && "collapsible" in props && Boolean(props.collapsible);
	const [opened, setOpened] = useControllableState<readonly string[]>({
		prop: openedList(value),
		defaultProp: openedList(defaultValue) ?? [],
		onChange: (next) => tellOpened(props, next),
	});
	const baseId = useId();
	const toggle = (item: string): void => setOpened(toggledOpen(opened, item, { isMultiple, isCollapsible }));
	const idOf = (item: string, part: "trigger" | "content"): string => `${baseId}-${part}-${encodeURIComponent(item)}`;
	const keys = stepKeysOf(orientation, rest.dir);
	return (
		<AccordionContext.Provider
			value={{ opened, toggle, isDisabled: disabled, canShut: isMultiple || isCollapsible, idOf }}
		>
			<div
				data-slot="accordion"
				data-orientation={orientation}
				{...withoutCollapsible(rest)}
				className={cn("wg-kit-accordion", rest.className)}
				onKeyDown={(event) => {
					rest.onKeyDown?.(event);
					focusStepped(event, ownedBy(event.currentTarget, TRIGGER, ROOT), keys);
				}}
			/>
		</AccordionContext.Provider>
	);
}

function tellOpened(props: AccordionProps, next: readonly string[]): void {
	if (props.type === "multiple") props.onValueChange?.([...next]);
	else props.onValueChange?.(next[0] ?? "");
}

function withoutCollapsible<P extends object>(rest: P): Omit<P, "collapsible"> {
	const { collapsible, ...dom } = { collapsible: undefined, ...rest };
	return dom;
}
