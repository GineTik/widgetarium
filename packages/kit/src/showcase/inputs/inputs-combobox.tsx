import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
} from "../../index";
import { Named } from "../frame/named";
import { FRAMEWORKS } from "../showcase-data";

export function InputsCombobox(): ReactElement {
	const [picked, setPicked] = useState<string[]>(["Astro"]);
	return (
		<div className="wg-showcase-stack">
			<Named name="Combobox items · ComboboxInput · ComboboxList">
				<Combobox items={FRAMEWORKS}>
					<ComboboxInput placeholder="Select a framework" />
					<ComboboxContent>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</Named>
			<Named name="Combobox multiple · ComboboxChips">
				<Combobox items={FRAMEWORKS} multiple value={picked} onValueChange={setPicked}>
					<ComboboxChips>
						<ComboboxValue>
							{(values) => values.map((value) => <ComboboxChip key={value}>{value}</ComboboxChip>)}
						</ComboboxValue>
						<ComboboxChipsInput placeholder="Add framework" />
					</ComboboxChips>
					<ComboboxContent>
						<ComboboxEmpty>No items found.</ComboboxEmpty>
						<ComboboxList>
							{(item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</Named>
		</div>
	);
}
