import { createElement as h } from "react";
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
	Button,
} from "../../index";

export function DeleteAlert({ isOpen }: { readonly isOpen: boolean }): ReactElement {
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
