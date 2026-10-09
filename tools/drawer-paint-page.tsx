import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "../packages/kit/src/index";

type Shown = "sheet" | "drawer" | "plain";

const GOAL_SNAPS = [0.4, 0.75] as const;

function Goal(): ReactElement {
	return (
		<DrawerHeader>
			<DrawerTitle>Move goal</DrawerTitle>
			<DrawerDescription id="drawer-body">Set your daily activity goal.</DrawerDescription>
		</DrawerHeader>
	);
}

function Shown({ shown }: { readonly shown: Shown }): ReactElement {
	if (shown === "sheet")
		return (
			<Sheet defaultOpen>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Edit profile</SheetTitle>
						<SheetDescription>Make changes to your profile here.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>
		);
	if (shown === "plain")
		return (
			<Drawer defaultOpen>
				<DrawerContent>
					<Goal />
				</DrawerContent>
			</Drawer>
		);
	return (
		<Drawer defaultOpen snapPoints={GOAL_SNAPS}>
			<DrawerContent showCloseButton>
				<Goal />
			</DrawerContent>
		</Drawer>
	);
}

const host = document.getElementById("host");
if (!host) throw new Error("drawer paint: the page has no #host");
let root: Root | null = null;

Object.assign(window, {
	show: (shown: Shown): void => {
		root?.unmount();
		root = createRoot(host);
		root.render(<Shown shown={shown} />);
	},
});
