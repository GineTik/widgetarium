import { createElement as h } from "react";
import { ActionButton } from "./action-button";
import { Layout } from "./layout";
import { LayoutActions } from "./layout-actions";
import { LayoutHeader } from "./layout-header";
import { LayoutItem } from "./layout-item";
import { LayoutTitle } from "./layout-title";

export function Rows(props) {
	return <Layout {...props} kind="rows" />;
}

Rows.Header = LayoutHeader;

Rows.Title = LayoutTitle;

Rows.Actions = LayoutActions;

Rows.ActionButton = ActionButton;

Rows.Item = LayoutItem;
