import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import {
	Button,
	Card,
	Icon,
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
	LayoutItem,
	List,
	Row,
	RowBadge,
	RowLabel,
	RowSupporting,
	RowText,
	RowValue,
} from "../packages/kit/src/index";

const NAMES = ["Inbox", "Drafts", "Archive"];

function LayoutItemRows(): ReactElement {
	return (
		<ItemGroup>
			{NAMES.map((name) => (
				<LayoutItem key={name}>
					<RowText>
						<RowLabel>{name}</RowLabel>
						<RowSupporting>12 notes waiting</RowSupporting>
					</RowText>
				</LayoutItem>
			))}
		</ItemGroup>
	);
}

function ItemRows(): ReactElement {
	return (
		<ItemGroup>
			{NAMES.map((name) => (
				<Item key={name}>
					<ItemContent>
						<ItemTitle>{name}</ItemTitle>
						<ItemDescription>12 notes waiting</ItemDescription>
					</ItemContent>
				</Item>
			))}
		</ItemGroup>
	);
}

function RowList(): ReactElement {
	return (
		<List>
			{NAMES.map((name) => (
				<Row key={name}>
					<RowBadge>
						<Icon name="inbox" />
					</RowBadge>
					<RowText>
						<RowLabel>{name}</RowLabel>
						<RowSupporting>12 notes waiting</RowSupporting>
					</RowText>
					<RowValue>12</RowValue>
				</Row>
			))}
		</List>
	);
}

function ItemList(): ReactElement {
	return (
		<ItemGroup>
			{NAMES.map((name) => (
				<Item key={name} variant="outline">
					<ItemMedia variant="icon">
						<Icon name="inbox" />
					</ItemMedia>
					<ItemContent>
						<ItemTitle>{name}</ItemTitle>
						<ItemDescription>12 notes waiting</ItemDescription>
					</ItemContent>
					<ItemActions>12</ItemActions>
				</Item>
			))}
		</ItemGroup>
	);
}

function ItemGroupWithSeparator(): ReactElement {
	return (
		<ItemGroup>
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>Inbox</ItemTitle>
				</ItemContent>
				<ItemActions>
					<Button size="sm" variant="outline">
						Open
					</Button>
				</ItemActions>
			</Item>
			<ItemSeparator />
			<Item>
				<ItemContent>
					<ItemTitle>Archive older than a year</ItemTitle>
				</ItemContent>
				<ItemActions>
					<Icon name="chevron-right" />
				</ItemActions>
			</Item>
		</ItemGroup>
	);
}

function Page(): ReactElement {
	useEffect(() => {
		Reflect.set(window, "ready", true);
	}, []);
	return (
		<div style={{ width: "360px", display: "flex", flexDirection: "column", gap: "24px" }}>
			<div id="rows-li">
				<LayoutItemRows />
			</div>
			<div id="item-rows">
				<ItemRows />
			</div>
			<div id="list-row">
				<RowList />
			</div>
			<div id="item-list">
				<ItemList />
			</div>
			<div id="item-group">
				<ItemGroupWithSeparator />
			</div>
			<div id="card">
				<Card>Archive older than a year</Card>
			</div>
			<div id="muted">
				<Item variant="muted">
					<ItemContent>
						<ItemTitle>Archive older than a year</ItemTitle>
					</ItemContent>
				</Item>
			</div>
		</div>
	);
}

const host = document.getElementById("host");
if (host) createRoot(host).render(<Page />);
