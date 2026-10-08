import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	Input,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "../../index";

export function EditSheet({ isOpen }: { readonly isOpen: boolean }): ReactElement {
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
