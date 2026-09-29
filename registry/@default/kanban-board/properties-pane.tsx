import { Sidebar, SidebarGroup } from "widgetarium/kit";
import { AddProperty } from "./add-property";
import { PropertyRow } from "./property-row";

type PropertiesPaneProps = {
	names: string[];
	props: Record<string, unknown>;
	columns: string[];
	roster: string[];
	today: Date;
	onWrite: (key: string, value: unknown) => void;
	onAddProperty?: ((names: string[]) => void) | undefined;
};

export function PropertiesPane({ names, props, columns, roster, today, onWrite, onAddProperty }: PropertiesPaneProps) {
	return (
		<Sidebar mode="minimal" className="otd-props">
			<div className="otd-plate-head">
				<h4>Properties</h4>
			</div>
			<SidebarGroup>
				{names.map((name) => (
					<PropertyRow
						key={name}
						name={name}
						props={props}
						columns={columns}
						roster={roster}
						today={today}
						onWrite={onWrite}
					/>
				))}
			</SidebarGroup>
			{onAddProperty ? <AddProperty taken={names} onAdd={(name) => onAddProperty([...names, name])} /> : null}
		</Sidebar>
	);
}
