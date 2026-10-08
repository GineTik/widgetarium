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
