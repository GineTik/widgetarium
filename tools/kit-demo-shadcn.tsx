import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Avatar,
	AvatarFallback,
	Badge,
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	Icon,
	Input,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	ToggleGroup,
	ToggleGroupItem,
} from "../packages/kit/src/index";
import { Named } from "./kit-demo-frame.tsx";

export function ShadcnButtons(): ReactElement {
	return (
		<div className="demo-stack">
			<div className="demo-row">
				<Button variant="default">Default</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
				<Button variant="destructive">Destructive</Button>
			</div>
			<div className="demo-row">
				<Button size="sm">Small</Button>
				<Button size="lg">Large</Button>
				<Button size="icon" variant="outline" aria-label="Search">
					<Icon name="search" size={16} />
				</Button>
				<Badge variant="default">Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="destructive">Destructive</Badge>
				<Badge variant="outline">Outline</Badge>
			</div>
		</div>
	);
}

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
				<div className="demo-row">
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

export function ShadcnForm(): ReactElement {
	return (
		<FieldGroup>
			<Field>
				<FieldLabel>Name</FieldLabel>
				<Input placeholder="Ada Lovelace" />
				<FieldDescription>As it appears on the invoice.</FieldDescription>
			</Field>
			<Field data-invalid="true">
				<FieldLabel>Email</FieldLabel>
				<Input placeholder="ada@example.org" />
				<FieldError errors={[{ message: "Enter an email address." }]} />
			</Field>
			<FieldSeparator>or</FieldSeparator>
			<Field orientation="horizontal">
				<Checkbox defaultChecked label="Remember me" />
				<FieldLabel>Remember me</FieldLabel>
			</Field>
			<Field>
				<FieldLabel>Note</FieldLabel>
				<Textarea placeholder="Anything else" />
			</Field>
		</FieldGroup>
	);
}

export function ShadcnCommand(): ReactElement {
	return (
		<Command>
			<CommandInput placeholder="Type a command or search…" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup heading="Suggestions">
					<CommandItem>
						<Icon name="calendar" size={16} />
						<span>Calendar</span>
					</CommandItem>
					<CommandItem>
						<Icon name="face-slightly-smiling" size={16} />
						<span>Search emoji</span>
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Settings">
					<CommandItem>
						<Icon name="settings" size={16} />
						<span>Settings</span>
						<CommandShortcut>⌘S</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

export function ShadcnSwitches(): ReactElement {
	return (
		<div className="demo-stack">
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
