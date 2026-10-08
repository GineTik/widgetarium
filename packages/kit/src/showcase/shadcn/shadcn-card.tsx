import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Avatar,
	AvatarFallback,
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../index";

export function ShadcnCard(): ReactElement {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Team</CardTitle>
				<CardDescription>Who works on the launch.</CardDescription>
				<CardAction>
					<Button size="sm" variant="outline">
						Invite
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div className="wg-showcase-row">
					<Avatar label="Ada Lovelace">
						<AvatarFallback>AL</AvatarFallback>
					</Avatar>
					<Avatar label="Grace Hopper">
						<AvatarFallback>GH</AvatarFallback>
					</Avatar>
				</div>
			</CardContent>
			<CardFooter>
				<Button variant="default">Save</Button>
				<Button variant="ghost">Cancel</Button>
			</CardFooter>
		</Card>
	);
}
