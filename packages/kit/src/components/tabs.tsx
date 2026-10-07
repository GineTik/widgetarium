import { createElement as h } from "react";
import type { Key, ReactElement } from "react";
import { Segmented } from "./segmented";
import type { SegmentedProps } from "./segmented";
import { TabsRoot } from "./tabs-root";
import type { TabsRootProps } from "./tabs-root";

export { TabsContent } from "./tabs-content";
export { TabsList } from "./tabs-list";
export { TabsTrigger } from "./tabs-trigger";
export type { TabsListProps } from "./tabs-list";
export type { TabsTriggerProps } from "./tabs-trigger";
export type { TabsContentProps } from "./tabs-content";
export type { TabsRootProps } from "./tabs-root";

export type TabsProps<V extends Key> = TabsRootProps | SegmentedProps<V>;

// TRADE-OFF: Tabs given items is the Segmented it aliased before shadcn's Tabs took the name
export function Tabs(props: TabsRootProps): ReactElement;
export function Tabs<V extends Key>(props: SegmentedProps<V>): ReactElement;
export function Tabs<V extends Key>(props: TabsProps<V>): ReactElement {
	if ("items" in props) return <Segmented {...props} />;
	return <TabsRoot {...props} />;
}
