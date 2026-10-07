import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
	AspectRatio,
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	Card,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Grid,
	Icon,
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
	Marker,
	MarkerContent,
	MarkerIcon,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	ScrollArea,
	Separator,
	Shape,
	Spinner,
	TypographyBlockquote,
	TypographyH3,
	TypographyInlineCode,
	TypographyLead,
	TypographyMuted,
	TypographyP,
} from "../packages/kit/src/index";
import { Named, Section } from "./kit-demo-frame.tsx";

const TAGS = Array.from({ length: 24 }, (_, at) => `v1.2.0-beta.${24 - at}`);
const SLIDES = ["Morning pages", "Reading list", "Weekly review", "Ideas"];

const USAGE = {
	accordion: `<Accordion type="single" collapsible defaultValue="item-1">
	<AccordionItem value="item-1">
		<AccordionTrigger>Is it accessible?</AccordionTrigger>
		<AccordionContent>Yes. It follows the WAI-ARIA pattern.</AccordionContent>
	</AccordionItem>
</Accordion>`,
	alert: `<Alert variant="destructive">
	<Icon name="circle-alert" />
	<AlertTitle>Sync failed</AlertTitle>
	<AlertDescription>Three notes could not be written.</AlertDescription>
	<AlertAction><Button size="sm" variant="outline">Retry</Button></AlertAction>
</Alert>`,
	navigation: `<Breadcrumb>
	<BreadcrumbList>
		<BreadcrumbItem><BreadcrumbLink href="#">Vault</BreadcrumbLink></BreadcrumbItem>
		<BreadcrumbSeparator />
		<BreadcrumbItem><BreadcrumbPage>Weekly</BreadcrumbPage></BreadcrumbItem>
	</BreadcrumbList>
</Breadcrumb>
<Separator orientation="vertical" />`,
	scroll: `<ScrollArea fade className="h-48">…rows…</ScrollArea>
<p className="shimmer">Thinking…</p>
<div className="scroll-fade overflow-auto">…</div>`,
	resizable: `<ResizablePanelGroup direction="horizontal">
	<ResizablePanel defaultSize={40} minSize={20}>Notes</ResizablePanel>
	<ResizableHandle withHandle />
	<ResizablePanel>Preview</ResizablePanel>
</ResizablePanelGroup>`,
	carousel: `<Carousel opts={{ loop: true }} setApi={setApi}>
	<CarouselContent>
		<CarouselItem className="basis-1/2">…</CarouselItem>
	</CarouselContent>
	<CarouselPrevious />
	<CarouselNext />
</Carousel>`,
	item: `<ItemGroup>
	<Item variant="outline">
		<ItemMedia variant="icon"><Icon name="inbox" /></ItemMedia>
		<ItemContent>
			<ItemTitle>Inbox</ItemTitle>
			<ItemDescription>12 notes waiting</ItemDescription>
		</ItemContent>
		<ItemActions><Button size="sm">Open</Button></ItemActions>
	</Item>
</ItemGroup>`,
	marker: `<Marker role="status">
	<MarkerIcon><Spinner /></MarkerIcon>
	<MarkerContent className="shimmer">Thinking…</MarkerContent>
</Marker>
<Marker variant="separator"><MarkerContent>Conversation compacted</MarkerContent></Marker>`,
};

function Disclosures(): ReactElement {
	return (
		<div className="demo-stack">
			<Accordion type="single" collapsible defaultValue="sync">
				<AccordionItem value="sync">
					<AccordionTrigger>How does sync work?</AccordionTrigger>
					<AccordionContent>Every note is written to the vault first, then mirrored to each device.</AccordionContent>
				</AccordionItem>
				<AccordionItem value="offline">
					<AccordionTrigger>Can I work offline?</AccordionTrigger>
					<AccordionContent>Yes. Changes wait in the vault until a device is back online.</AccordionContent>
				</AccordionItem>
				<AccordionItem value="share">
					<AccordionTrigger>Can I share a board?</AccordionTrigger>
					<AccordionContent>A board is a note, so it travels with the vault.</AccordionContent>
				</AccordionItem>
			</Accordion>
			<Collapsible defaultOpen>
				<Named name="Collapsible · CollapsibleTrigger asChild">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm">
							3 starred notes
						</Button>
					</CollapsibleTrigger>
				</Named>
				<CollapsibleContent>
					<div className="demo-stack">
						<span>Garden plan</span>
						<span>Reading list</span>
						<span>Trip to Lisbon</span>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

function Alerts(): ReactElement {
	return (
		<div className="demo-stack">
			<Alert>
				<Icon name="info" />
				<AlertTitle>Heads up</AlertTitle>
				<AlertDescription>Widgets update when the vault does.</AlertDescription>
			</Alert>
			<Alert variant="destructive">
				<Icon name="circle-alert" />
				<AlertTitle>Sync failed</AlertTitle>
				<AlertDescription>Three notes could not be written.</AlertDescription>
				<AlertAction>
					<Button size="sm" variant="outline">
						Retry
					</Button>
				</AlertAction>
			</Alert>
			<Alert tone="success">
				<Icon name="check" />
				<AlertTitle>Backup complete</AlertTitle>
			</Alert>
		</div>
	);
}

function Navigation(): ReactElement {
	return (
		<div className="demo-stack">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Vault</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbEllipsis />
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Journal</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Weekly review</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<Separator />
			<div className="demo-row">
				<span>Notes</span>
				<Separator orientation="vertical" />
				<span>Links</span>
				<Separator orientation="vertical" />
				<span>Tags</span>
			</div>
			<Named name="AspectRatio ratio={16 / 9}">
				<AspectRatio ratio={16 / 9}>
					<Card>
						<Shape name="cookie12-sided" seed={3} />
					</Card>
				</AspectRatio>
			</Named>
		</div>
	);
}

function Scrolling(): ReactElement {
	return (
		<div className="demo-stack">
			<Named name="ScrollArea fade · thin thumb on hover">
				<Card>
					<ScrollArea fade type="always" style={{ height: "176px" }}>
						<div className="demo-stack">
							{TAGS.map((tag) => (
								<span key={tag} className="demo-code">
									{tag}
								</span>
							))}
						</div>
					</ScrollArea>
				</Card>
			</Named>
			<Named name="className wg-kit-shimmer · Tailwind shimmer">
				<span className="wg-kit-shimmer">Reading 4 files…</span>
			</Named>
		</div>
	);
}

function Resizing(): ReactElement {
	return (
		<Card style={{ height: "180px" }}>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={40} minSize={20}>
					<div className="demo-pane">Notes</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={60}>
							<div className="demo-pane">Preview</div>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel>
							<div className="demo-pane">Outline</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Card>
	);
}

function Slides(): ReactElement {
	return (
		<Carousel opts={{ loop: true }}>
			<CarouselContent>
				{SLIDES.map((title, at) => (
					<CarouselItem key={title}>
						<Card>
							<div className="demo-slide">
								<Shape name="burst" seed={at + 1} />
								<span>{title}</span>
							</div>
						</Card>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	);
}

function Items(): ReactElement {
	return (
		<ItemGroup>
			<Item variant="outline">
				<ItemMedia variant="icon">
					<Icon name="inbox" size={20} />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>Inbox</ItemTitle>
					<ItemDescription>12 notes waiting for a home.</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button size="sm" variant="outline">
						Open
					</Button>
				</ItemActions>
			</Item>
			<ItemSeparator />
			<Item variant="muted" size="sm">
				<ItemContent>
					<ItemTitle>Archive older than a year</ItemTitle>
				</ItemContent>
				<ItemActions>
					<Icon name="chevron-right" />
				</ItemActions>
			</Item>
			<Item render={<a href="#" />}>
				<ItemContent>
					<ItemTitle>Item render as a link</ItemTitle>
					<ItemDescription>Hover it: the row answers.</ItemDescription>
				</ItemContent>
			</Item>
		</ItemGroup>
	);
}

function Markers(): ReactElement {
	return (
		<div className="demo-stack">
			<Marker role="status">
				<MarkerIcon>
					<Spinner size={16} />
				</MarkerIcon>
				<MarkerContent className="wg-kit-shimmer">Thinking…</MarkerContent>
			</Marker>
			<Marker>
				<MarkerIcon>
					<Icon name="check" />
				</MarkerIcon>
				<MarkerContent>Explored 4 files</MarkerContent>
			</Marker>
			<Marker variant="border">
				<MarkerIcon>
					<Icon name="git-branch" />
				</MarkerIcon>
				<MarkerContent>Switched to a new branch</MarkerContent>
			</Marker>
			<Marker variant="separator">
				<MarkerContent>Conversation compacted</MarkerContent>
			</Marker>
		</div>
	);
}

function Type(): ReactElement {
	return (
		<div>
			<TypographyH3>The joke tax</TypographyH3>
			<TypographyLead>A modal dialog that interrupts the user with important content.</TypographyLead>
			<TypographyP>
				The king thought long and hard, and finally came up with{" "}
				<TypographyInlineCode>a brilliant plan</TypographyInlineCode>.
			</TypographyP>
			<TypographyBlockquote>“After all,” he said, “everyone enjoys a good joke.”</TypographyBlockquote>
			<TypographyMuted>Enter your email address.</TypographyMuted>
		</div>
	);
}

export function LayoutDemos(): ReactElement {
	return (
		<Grid min={340}>
			<Section
				title="Accordion · Collapsible"
				note="type single · multiple, collapsible, the height springs"
				usage={USAGE.accordion}
			>
				<Disclosures />
			</Section>
			<Section title="Alert" note="variant default · destructive, plus tone; AlertAction" usage={USAGE.alert}>
				<Alerts />
			</Section>
			<Section title="Breadcrumb · Separator · AspectRatio" usage={USAGE.navigation}>
				<Navigation />
			</Section>
			<Section title="ScrollArea · scroll-fade · shimmer" note="edges fade only where rows hide" usage={USAGE.scroll}>
				<Scrolling />
			</Section>
			<Section title="Resizable" note="drag the grip, or focus it and press the arrows" usage={USAGE.resizable}>
				<Resizing />
			</Section>
			<Section title="Carousel" note="scroll-snap, a mouse drag, the arrow keys" usage={USAGE.carousel}>
				<Slides />
			</Section>
			<Section title="Item" note="variant default · outline · muted, size, render" usage={USAGE.item}>
				<Items />
			</Section>
			<Section title="Marker" note="a status line, a border row, a labelled separator" usage={USAGE.marker}>
				<Markers />
			</Section>
			<Section title="Typography" note="shadcn's typography page as components" usage="<TypographyH3>…</TypographyH3>">
				<Type />
			</Section>
		</Grid>
	);
}
