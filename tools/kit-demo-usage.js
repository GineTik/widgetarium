export const USAGE = {
	button: `import { Button, IconButton, Icon } from "widgetarium/kit";

<Button variant="accent" size="l">Create</Button>
<Button variant="danger">Delete</Button>
<Button isLoading>Saving</Button>
<Button isDone>Saved</Button>
<IconButton label="Search"><Icon name="search" /></IconButton>`,
	badge: `import { Badge } from "widgetarium/kit";

<Badge tone="success">Paid</Badge>
<Badge tone="accent" variant="solid">3</Badge>
<Badge color="purple" size="s">purple</Badge>`,
	inputs: `import { Field, Icon, Segmented, Select, SelectContent,
	SelectItem, SelectTrigger, SelectValue, Switch } from "widgetarium/kit";

<Field icon={<Icon name="search" size={16} />} placeholder="Search invoices" />

<Select value={status} onValueChange={setStatus}>
	<SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
	<SelectContent>
		<SelectItem value="sent">Sent</SelectItem>
		<SelectItem value="paid">Paid</SelectItem>
	</SelectContent>
</Select>

<Segmented items={[{ value: "list", label: "List" }, { value: "board", label: "Board" }]}
	value={view} onValueChange={setView} />

<Switch checked={isOn} onCheckedChange={setOn} label="Archive when done" />`,
	emblem: `import { Emblem, EmblemImage, EmblemFallback } from "widgetarium/kit";

<Emblem size="l" label={person.name}>
	<EmblemImage src={person.photo} />
	<EmblemFallback seed={person.ref} />
</Emblem>`,
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
	calendar: `import { Calendar } from "widgetarium/kit";

<Calendar selected={due} onSelect={setDue} today={new Date()} />`,
};
