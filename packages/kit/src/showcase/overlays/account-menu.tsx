import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Icon,
} from "../../index";

export function AccountMenu({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<DropdownMenu defaultOpen={isOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					<Icon name="user" size={16} /> Account
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>My account</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Icon name="user" size={16} />
						Profile
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Icon name="settings" size={16} />
						Settings
						<DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem defaultChecked>Status bar</DropdownMenuCheckboxItem>
				<DropdownMenuRadioGroup defaultValue="bottom">
					<DropdownMenuRadioItem value="top">Panel on top</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="bottom">Panel at the bottom</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuSub defaultOpen={isOpen}>
					<DropdownMenuSubTrigger>
						<Icon name="user-plus" size={16} />
						Invite users
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>
							<Icon name="mail" size={16} />
							Email
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Icon name="message-square" size={16} />
							Message
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem disabled>API</DropdownMenuItem>
				<DropdownMenuItem variant="destructive">
					<Icon name="log-out" size={16} />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
