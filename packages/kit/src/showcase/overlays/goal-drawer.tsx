import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "../../index";

export function GoalDrawer({ isOpen }: { readonly isOpen: boolean }): ReactElement {
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
				<div className="wg-showcase-goal">350 kcal / day</div>
				<DrawerFooter>
					<DrawerClose variant="default">Submit</DrawerClose>
					<DrawerClose variant="outline">Cancel</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
