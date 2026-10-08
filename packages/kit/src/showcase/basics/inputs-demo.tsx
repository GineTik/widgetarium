import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Icon,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
	Tabs,
	TabsList,
	TabsTrigger,
} from "../../index";
import { STATUS_ITEMS, VIEWS } from "../showcase-data";

export function InputsDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Input icon={<Icon name="search" size={16} />} placeholder="Search invoices" />
			<Select defaultValue="sent">
				<SelectTrigger>
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					{STATUS_ITEMS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Tabs defaultValue="board">
				<TabsList>
					{VIEWS.map((view) => (
						<TabsTrigger key={view.value} value={view.value}>
							{view.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
			<div className="wg-showcase-row">
				<Switch defaultChecked label="Archive when done" />
				<span>Archive when done</span>
			</div>
		</div>
	);
}
