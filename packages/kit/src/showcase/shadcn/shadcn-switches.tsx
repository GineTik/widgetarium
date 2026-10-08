import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	Icon,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	ToggleGroup,
	ToggleGroupItem,
} from "../../index";
import { Named } from "../frame/named";

export function ShadcnSwitches(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Named name="Tabs · TabsList · TabsTrigger · TabsContent">
				<Tabs defaultValue="account">
					<TabsList>
						<TabsTrigger value="account">Account</TabsTrigger>
						<TabsTrigger value="password">Password</TabsTrigger>
					</TabsList>
					<TabsContent value="account">Make changes to your account here.</TabsContent>
					<TabsContent value="password">Change your password here.</TabsContent>
				</Tabs>
			</Named>
			<Named name="ToggleGroup type=multiple">
				<ToggleGroup type="multiple" defaultValue={["bold"]}>
					<ToggleGroupItem value="bold" aria-label="Bold">
						<Icon name="bold" size={16} />
					</ToggleGroupItem>
					<ToggleGroupItem value="italic" aria-label="Italic">
						<Icon name="italic" size={16} />
					</ToggleGroupItem>
					<ToggleGroupItem value="underline" aria-label="Underline">
						<Icon name="underline" size={16} />
					</ToggleGroupItem>
				</ToggleGroup>
			</Named>
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon name="folder" size={20} />
					</EmptyMedia>
					<EmptyTitle>No projects yet</EmptyTitle>
					<EmptyDescription>Create your first project to get started.</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button variant="default">Create project</Button>
				</EmptyContent>
			</Empty>
		</div>
	);
}
