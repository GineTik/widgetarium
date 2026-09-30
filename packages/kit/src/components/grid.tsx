import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ActionButton } from "./action-button";
import { Layout } from "./layout";
import type { LayoutProps } from "./layout";
import { LayoutActions } from "./layout-actions";
import { LayoutHeader } from "./layout-header";
import { LayoutItem } from "./layout-item";
import { LayoutTitle } from "./layout-title";

export function Grid(props: Omit<LayoutProps, "kind">): ReactElement {
	return <Layout {...props} kind="grid" />;
}

Grid.Header = LayoutHeader;

Grid.Title = LayoutTitle;

Grid.Actions = LayoutActions;

Grid.ActionButton = ActionButton;

Grid.Item = LayoutItem;
