import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
	Icon,
} from "../../index";

export function ShadcnCommand(): ReactElement {
	return (
		<Command>
			<CommandInput placeholder="Type a command or search…" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Suggestions">
					<CommandItem>
						<Icon name="calendar" size={16} />
						<span>Calendar</span>
					</CommandItem>
					<CommandItem>
						<Icon name="face-slightly-smiling" size={16} />
						<span>Search emoji</span>
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Settings">
					<CommandItem>
						<Icon name="settings" size={16} />
						<span>Settings</span>
						<CommandShortcut>⌘S</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
