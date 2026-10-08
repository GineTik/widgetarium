import { createElement as h } from "react";
import type { FunctionComponent, HTMLAttributes, ReactElement } from "react";
import { cn } from "./cn";

export type TypesetTag = "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "ul" | "code" | "div" | "small";

type TypesetPart = FunctionComponent<HTMLAttributes<HTMLElement>>;

export function createTypesetPart(tag: TypesetTag, kind: string, name: string): TypesetPart {
	function Part({ className, ...rest }: HTMLAttributes<HTMLElement>): ReactElement {
		return h(tag, {
			"data-slot": "typography",
			"data-kind": kind,
			...rest,
			className: cn(`wg-kit-type-${kind}`, className),
		});
	}
	Part.displayName = name;
	return Part;
}
