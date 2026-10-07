import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useCommand } from "./command-context";

export function CommandEmpty({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement | null {
	if (!useCommand().isEmpty) return null;
	return <div role="presentation" data-slot="command-empty" {...rest} className={cn("wg-kit-cmd-empty", className)} />;
}
