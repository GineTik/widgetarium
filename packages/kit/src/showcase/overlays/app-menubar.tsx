import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
} from "../../index";

export function AppMenubar({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<Menubar defaultValue={isOpen ? "edit" : ""}>
			<MenubarMenu value="file">
				<MenubarTrigger>File</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						New tab <MenubarShortcut>⌘T</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>New window</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="edit">
				<MenubarTrigger>Edit</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>
						Undo <MenubarShortcut>⌘Z</MenubarShortcut>
					</MenubarItem>
					<MenubarItem>
						Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
					</MenubarItem>
					<MenubarSeparator />
					<MenubarItem>Find</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
			<MenubarMenu value="view">
				<MenubarTrigger>View</MenubarTrigger>
				<MenubarContent>
					<MenubarItem>Reload</MenubarItem>
				</MenubarContent>
			</MenubarMenu>
		</Menubar>
	);
}
