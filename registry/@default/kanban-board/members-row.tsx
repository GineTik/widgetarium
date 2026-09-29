import { Popover } from "widgetarium/kit";
import { useState } from "react";
import { Avatar } from "./avatar";
import { MembersValue } from "./members-value";
import { RosterPicker } from "./roster-picker";
import { RowFrame } from "./row-frame";
import { toTrimmedList } from "./task-fields";
import type { Anchor } from "./types";

type MembersRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	roster: string[];
	onPick: (next: string[]) => void;
};

export function MembersRow({ anchor, name, value, roster, onPick }: MembersRowProps) {
	const [isOpen, setOpen] = useState(false);
	const held = toTrimmedList(value);
	const unset = held.length === 0;

	const toggle = (person: string) => {
		onPick(held.includes(person) ? held.filter((entry) => entry !== person) : [...held, person]);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					<MembersValue held={held} />
				</RowFrame>
			}
		>
			<RosterPicker
				placeholder="Find a person"
				roster={roster}
				isChosen={(person) => held.includes(person)}
				onPick={toggle}
				label={(person) => (
					<>
						<Avatar person={person} />
						{person}
					</>
				)}
				addLabel={(typed) => typed}
			/>
		</Popover>
	);
}
