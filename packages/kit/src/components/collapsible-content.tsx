import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useCollapsible } from "./collapsible-context";
import { CollapsePanel } from "./collapse-panel";

export type CollapsibleContentProps = HTMLAttributes<HTMLDivElement>;

export function CollapsibleContent(props: CollapsibleContentProps): ReactElement {
	const collapsible = useCollapsible();
	return <CollapsePanel {...props} slot="collapsible-content" isOpen={collapsible.isOpen} id={collapsible.contentId} />;
}
