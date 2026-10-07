import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Avatar,
	AvatarFallback,
	Button,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
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
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	Icon,
	Input,
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Toaster,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	navigationMenuTriggerStyle,
	toast,
} from "../packages/kit/src/index";
import { OVERLAYS_DEMO_CSS } from "./kit-demo-overlays-css.ts";

export type OpenedOverlay = "none" | "floating" | "sheet" | "drawer" | "alert" | "toast";

export interface OverlaysShowcaseProps {
	readonly opened: OpenedOverlay;
}

export const OVERLAYS_USAGE = `import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
	Tooltip, TooltipTrigger, TooltipContent, Sheet, SheetTrigger, SheetContent,
	Toaster, toast } from "widgetarium/kit";

<DropdownMenu>
	<DropdownMenuTrigger asChild><Button variant="outline">Open</Button></DropdownMenuTrigger>
	<DropdownMenuContent align="start">
		<DropdownMenuItem>Profile<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut></DropdownMenuItem>
		<DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>

<Toaster />
toast.success("Event created", { action: { label: "Undo", onClick: undo } });`;

const SHOT_TOASTS_MS = Infinity;

export function OverlaysShowcase({ opened }: OverlaysShowcaseProps): ReactElement {
	const isFloating = opened === "floating";
	return (
		<TooltipProvider delayDuration={300}>
			<style>{OVERLAYS_DEMO_CSS}</style>
			<div className="demo-overlays">
				<div className="demo-overlays-row">
					<AccountMenu isOpen={isFloating} />
					<AppMenubar isOpen={isFloating} />
					<DocsNavigation isOpen={isFloating} />
				</div>
				<div className="demo-overlays-row is-low">
					<Hints isOpen={isFloating} />
					<PlacedPopover isOpen={isFloating} />
					<NoteContextMenu />
				</div>
				<div className="demo-ov-row">
					<EditSheet isOpen={opened === "sheet" || opened === "toast"} />
					<GoalDrawer isOpen={opened === "drawer"} />
					<DeleteAlert isOpen={opened === "alert"} />
					<ToastButtons isShot={opened === "toast"} />
				</div>
				<Toaster
					position={opened === "toast" ? "bottom-left" : "bottom-right"}
					expand={opened === "toast"}
					richColors
				/>
			</div>
		</TooltipProvider>
	);
}

function AccountMenu({ isOpen }: { readonly isOpen: boolean }): ReactElement {
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

function AppMenubar({ isOpen }: { readonly isOpen: boolean }): ReactElement {
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

function DocsNavigation({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<NavigationMenu defaultValue={isOpen ? "start" : ""}>
			<NavigationMenuList>
				<NavigationMenuItem value="start">
					<NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="demo-nav-grid">
							<NavigationMenuLink href="#intro">
								<strong>Introduction</strong>
								<span className="demo-note">What a widget is, and where it lives.</span>
							</NavigationMenuLink>
							<NavigationMenuLink href="#install">
								<strong>Installation</strong>
								<span className="demo-note">Put the plugin into a vault.</span>
							</NavigationMenuLink>
							<NavigationMenuLink href="#kit">
								<strong>The kit</strong>
								<span className="demo-note">Every component, in shadcn's names.</span>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem value="docs">
					<NavigationMenuLink href="#docs" className={navigationMenuTriggerStyle()}>
						Docs
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}

function Hints({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<div className="demo-ov-row">
			<Tooltip defaultOpen={isOpen}>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" aria-label="Add to library">
						<Icon name="plus" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Add to library</TooltipContent>
			</Tooltip>
			<HoverCard defaultOpen={isOpen}>
				<HoverCardTrigger asChild>
					<Button variant="link">@ada</Button>
				</HoverCardTrigger>
				<HoverCardContent>
					<div className="demo-ov-row">
						<Avatar label="Ada Lovelace">
							<AvatarFallback>AL</AvatarFallback>
						</Avatar>
						<div className="demo-ov-stack">
							<strong>Ada Lovelace</strong>
							<span className="demo-note">Wrote the first program. Joined December 1842.</span>
						</div>
					</div>
				</HoverCardContent>
			</HoverCard>
		</div>
	);
}

function PlacedPopover({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<Popover defaultOpen={isOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline">Popover on the right</Button>
			</PopoverTrigger>
			<PopoverContent side="right" align="center" sideOffset={8}>
				<div className="demo-ov-stack demo-pad">
					<strong>Dimensions</strong>
					<Input placeholder="Width" />
				</div>
			</PopoverContent>
		</Popover>
	);
}

function NoteContextMenu(): ReactElement {
	return (
		<ContextMenu>
			<ContextMenuTrigger className="demo-context-area" id="demo-context-area">
				Right click here
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>
					Back <ContextMenuShortcut>⌘[</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem disabled>Forward</ContextMenuItem>
				<ContextMenuItem>Reload</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem variant="destructive">Delete note</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function EditSheet({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<Sheet defaultOpen={isOpen}>
			<SheetTrigger asChild>
				<Button variant="outline">Sheet</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit profile</SheetTitle>
					<SheetDescription>Make changes to your profile here. Save when you are done.</SheetDescription>
				</SheetHeader>
				<Input placeholder="Ada Lovelace" />
				<SheetFooter>
					<SheetClose variant="default">Save changes</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function GoalDrawer({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<Drawer defaultOpen={isOpen}>
			<DrawerTrigger asChild>
				<Button variant="outline">Drawer</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Move goal</DrawerTitle>
					<DrawerDescription>Set your daily activity goal. Drag the handle down to close.</DrawerDescription>
				</DrawerHeader>
				<div className="demo-goal">350 kcal / day</div>
				<DrawerFooter>
					<DrawerClose variant="default">Submit</DrawerClose>
					<DrawerClose variant="outline">Cancel</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

function DeleteAlert({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<AlertDialog defaultOpen={isOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="destructive">Delete</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete this note?</AlertDialogTitle>
					<AlertDialogDescription>
						This cannot be undone. The note and its widgets leave the vault.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive">Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function ToastButtons({ isShot }: { readonly isShot: boolean }): ReactElement {
	useShotToasts(isShot);
	return (
		<Button
			variant="outline"
			onClick={() =>
				toast("Event created", {
					description: "Sunday, December 3 at 9:00",
					action: { label: "Undo", onClick: () => undefined },
				})
			}
		>
			Toast
		</Button>
	);
}

function useShotToasts(isShot: boolean): void {
	useEffect(() => {
		if (!isShot) return;
		toast.error("Sync failed", { description: "The vault was busy.", duration: SHOT_TOASTS_MS });
		toast.success("Note saved", { duration: SHOT_TOASTS_MS });
		toast("Event created", {
			description: "Sunday, December 3 at 9:00",
			action: { label: "Undo", onClick: () => undefined },
			duration: SHOT_TOASTS_MS,
		});
	}, [isShot]);
}

export function openedFromHash(hash: string): OpenedOverlay {
	const word = hash.replace(/^#open=/, "");
	const known: readonly OpenedOverlay[] = ["floating", "sheet", "drawer", "alert", "toast"];
	return known.find((name) => name === word) ?? "none";
}
