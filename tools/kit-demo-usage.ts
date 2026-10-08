export const BASICS_USAGE = {
	shadcnButton: `import { Badge, Button } from "widgetarium/kit";

<Button variant="default">Save</Button>
<Button variant="outline" size="sm">Invite</Button>
<Button variant="destructive">Delete</Button>
<Badge variant="secondary">Draft</Badge>`,
	shadcnCard: `import { Card, CardHeader, CardTitle, CardDescription, CardAction,
	CardContent, CardFooter, Avatar, AvatarFallback } from "widgetarium/kit";

<Card>
	<CardHeader>
		<CardTitle>Team</CardTitle>
		<CardDescription>Who works on the launch.</CardDescription>
		<CardAction><Button size="sm" variant="outline">Invite</Button></CardAction>
	</CardHeader>
	<CardContent><Avatar><AvatarFallback>AL</AvatarFallback></Avatar></CardContent>
	<CardFooter><Button>Save</Button></CardFooter>
</Card>`,
	shadcnForm: `import { Field, FieldLabel, FieldDescription, FieldError, Input } from "widgetarium/kit";

<Field>
	<FieldLabel>Email</FieldLabel>
	<Input placeholder="ada@example.org" />
	<FieldError errors={[{ message: "Enter an email address." }]} />
</Field>`,
	shadcnCommand: `import { Command, CommandInput, CommandList, CommandEmpty,
	CommandGroup, CommandItem } from "widgetarium/kit";

<Command>
	<CommandInput placeholder="Search…" />
	<CommandList>
		<CommandEmpty>No results found.</CommandEmpty>
		<CommandGroup heading="Suggestions">
			<CommandItem onSelect={open}>Calendar</CommandItem>
		</CommandGroup>
	</CommandList>
</Command>`,
	shadcnSwitches: `import { Tabs, TabsList, TabsTrigger, TabsContent } from "widgetarium/kit";

<Tabs defaultValue="account">
	<TabsList>
		<TabsTrigger value="account">Account</TabsTrigger>
		<TabsTrigger value="password">Password</TabsTrigger>
	</TabsList>
	<TabsContent value="account">…</TabsContent>
</Tabs>`,
	button: `import { Button, Icon } from "widgetarium/kit";

<Button variant="default" size="lg">Create</Button>
<Button variant="destructive">Delete</Button>
<Button isLoading>Saving</Button>
<Button isDone>Saved</Button>
<Button size="icon" variant="ghost" aria-label="Search"><Icon name="search" /></Button>`,
	badge: `import { Badge } from "widgetarium/kit";

<Badge tone="success">Paid</Badge>
<Badge variant="default">3</Badge>
<Badge color="purple" size="s">purple</Badge>`,
	inputs: `import { Input, Icon, Select, SelectContent, SelectItem, SelectTrigger,
	SelectValue, Switch, Tabs, TabsList, TabsTrigger } from "widgetarium/kit";

<Input icon={<Icon name="search" size={16} />} placeholder="Search invoices" />

<Select value={status} onValueChange={setStatus}>
	<SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
	<SelectContent>
		<SelectItem value="sent">Sent</SelectItem>
		<SelectItem value="paid">Paid</SelectItem>
	</SelectContent>
</Select>

<Tabs value={view} onValueChange={setView}>
	<TabsList>
		<TabsTrigger value="list">List</TabsTrigger>
		<TabsTrigger value="board">Board</TabsTrigger>
	</TabsList>
</Tabs>

<Switch checked={isOn} onCheckedChange={setOn} label="Archive when done" />`,
	avatar: `import { Avatar, AvatarImage, AvatarFallback } from "widgetarium/kit";

<Avatar size="l" label={person.name}>
	<AvatarImage src={person.photo} />
	<AvatarFallback seed={person.ref} />
</Avatar>`,
	progress: `import { ProgressBar, StatusProgress } from "widgetarium/kit";

<ProgressBar value={64} label="Loaded" />
<StatusProgress value={45} label="Running" />
<ProgressBar shape="circle" size={72} value={72}
	displayValue={({ value }) => \`\${value}%\`} />`,
	sparkline: `import { Sparkline, SparklineArea, SparklineLine, SparklineDot } from "widgetarium/kit";

<Sparkline data={rows} dataKey="notes" color="success" label="Notes, twelve weeks">
	<SparklineArea />
	<SparklineLine />
	<SparklineDot at="last" />
</Sparkline>`,
	chart: `import { Area, AreaChart, CartesianGrid, ChartContainer, ChartLegend,
	ChartLegendContent, ChartTooltip, ChartTooltipContent, XAxis } from "widgetarium/kit/charts";

const config = { notes: { label: "Notes" }, links: { label: "Links", color: 2 } };

<ChartContainer config={config}>
	<AreaChart data={rows} margin={{ left: 12, right: 12 }} accessibilityLayer>
		<CartesianGrid vertical={false} />
		<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
		<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
		<ChartLegend content={<ChartLegendContent />} />
		<Area dataKey="notes" stroke="var(--color-notes)" fill="var(--color-notes)" fillOpacity={0.18} />
		<Area dataKey="links" stroke="var(--color-links)" fill="var(--color-links)" fillOpacity={0.18} />
	</AreaChart>
</ChartContainer>`,
	table: `import { Badge, DataTable, Pagination } from "widgetarium/kit";

const read = useData(records.list, {
	sort: sort ? [{ prop: sort.key, dir: sort.direction }] : [],
	offset: (page - 1) * 6,
	limit: 6,
});
const count = Math.ceil(read.total / 6);

<DataTable
	rows={read.data}
	columns={[
		{ key: "client", label: "Client" },
		{ key: "status", label: "Status", render: (row) => <Badge size="s">{row.status}</Badge> },
		{ key: "due", label: "Due", type: "date" },
		{ key: "amount", label: "Amount", type: "number" },
	]}
	sort={sort} onSortChange={setSort}
	selected={picked} onSelect={setPicked}
	isLoading={read.isLoading} failure={read.failure}
	page={page} count={count} onPageChange={setPage}
/>

<Pagination page={page} count={count} onPageChange={setPage} />
<Pagination page={page} count={count} onPageChange={setPage} variant="compact" />
<Pagination defaultPage={1} count={count} siblings={2} />`,
	skeleton: `import { Skeleton } from "widgetarium/kit";

<Skeleton kind="text" lines={3} />
<Skeleton kind="emblem" size="l" shape="rounded" />
<Skeleton kind="button" size="s" />
<Skeleton kind="row" />
<Skeleton kind="sparkline" height={40} />
<Skeleton kind="chart" />
<Skeleton kind="card" />
<Skeleton className="h-16" />`,
};
