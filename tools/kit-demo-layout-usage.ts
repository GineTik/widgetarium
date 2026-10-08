export const LAYOUT_USAGE = {
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
	typography: "<TypographyH3>…</TypographyH3>",
};
