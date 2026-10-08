import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	Icon,
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "../../index";

export function Items(): ReactElement {
	return (
		<ItemGroup>
			<Item variant="outline">
				<ItemMedia variant="icon">
					<Icon name="inbox" size={20} />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Inbox</ItemTitle>
					<ItemDescription>12 notes waiting for a home.</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="sm" variant="outline">
						Open
					</Button>
				</ItemActions>
			</Item>
			<ItemSeparator />
			<Item variant="muted" size="sm">
				<ItemContent>
					<ItemTitle>Archive older than a year</ItemTitle>
				</ItemContent>
				<ItemActions>
					<Icon name="chevron-right" />
				</ItemActions>
			</Item>
			<Item render={<a href="#" />}>
				<ItemContent>
					<ItemTitle>Item render as a link</ItemTitle>
					<ItemDescription>Hover it: the row answers.</ItemDescription>
				</ItemContent>
			</Item>
		</ItemGroup>
	);
}
