import { createElement as h, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	AspectRatio,
	Card,
	Carousel,
	Field,
	FieldDescription,
	FieldLabel,
	Input,
	Item,
	ItemContent,
	ItemGroup,
	ItemTitle,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	ScrollArea,
} from "../packages/kit/src/index";

const ROWS = Array.from({ length: 30 }, (_, at) => `Row ${at + 1}`);
const SLIDES = ["One", "Two", "Three", "Four"];

function Page() {
	useEffect(() => {
		Reflect.set(window, "ready", true);
	}, []);
	return (
		<div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
			<AspectRatio id="aspect" ratio={16 / 9}>
				<div />
			</AspectRatio>
			<Accordion id="accordion" type="single" collapsible defaultValue="a">
				<AccordionItem value="a">
					<AccordionTrigger>First</AccordionTrigger>
					<AccordionContent>
						<div style={{ height: "120px" }}>Body of the first</div>
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="b">
					<AccordionTrigger>Second</AccordionTrigger>
					<AccordionContent>
						<div style={{ height: "120px" }}>Body of the second</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			<ScrollArea id="scroll" fade style={{ height: "200px" }}>
				{ROWS.map((row) => (
					<div key={row} style={{ height: "40px" }}>
						{row}
					</div>
				))}
			</ScrollArea>
			<span id="skeleton" className="wg-kit-skeleton" />
			<p id="shimmer" className="wg-kit-shimmer">
				Thinking…
			</p>
			<Carousel id="carousel">
				<CarouselContent>
					{SLIDES.map((slide) => (
						<CarouselItem key={slide}>
							<div style={{ height: "100px" }}>{slide}</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious id="prev" />
				<CarouselNext id="next" />
			</Carousel>
			<div style={{ height: "120px" }}>
				<ResizablePanelGroup id="resizable" direction="horizontal">
					<ResizablePanel id="left" defaultSize={50} minSize={20}>
						Left
					</ResizablePanel>
					<ResizableHandle id="handle" withHandle />
					<ResizablePanel id="right" defaultSize={50}>
						Right
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
			<Card id="bare-plate">
				<div className="title">Text only</div>
				<div>Nothing on a plate here.</div>
			</Card>
			<Card id="holding-plate">
				<div>
					<div className="title">Holds a plate</div>
					<Card id="inner-plate">Inner plate</Card>
				</div>
			</Card>
			<Card id="sharing-plate">
				<div className="title">Questions</div>
				<Accordion type="single">
					<AccordionItem value="x">
						<AccordionTrigger>Shared</AccordionTrigger>
						<AccordionContent>Body</AccordionContent>
					</AccordionItem>
				</Accordion>
				<p id="sharing-note">Below the rows</p>
			</Card>
			<Card id="alone-plate">
				<Accordion type="single">
					<AccordionItem value="y">
						<AccordionTrigger>Alone</AccordionTrigger>
						<AccordionContent>Body</AccordionContent>
					</AccordionItem>
				</Accordion>
			</Card>
			<Field id="form-field">
				<FieldLabel htmlFor="form-input">Email</FieldLabel>
				<Input id="form-input" placeholder="ada@example.org" />
				<FieldDescription>Enter an email address.</FieldDescription>
			</Field>
			<ItemGroup id="item-group">
				<Item variant="outline">
					<ItemContent>
						<ItemTitle>First</ItemTitle>
					</ItemContent>
				</Item>
				<Item variant="muted">
					<ItemContent>
						<ItemTitle>Middle</ItemTitle>
					</ItemContent>
				</Item>
				<Item>
					<ItemContent>
						<ItemTitle>Last</ItemTitle>
					</ItemContent>
				</Item>
			</ItemGroup>
			<Item id="lone-item" variant="muted">
				<ItemContent>
					<ItemTitle>Alone</ItemTitle>
				</ItemContent>
			</Item>
			<Card id="filled-beside-plates">
				<Card id="choice-plate">A choice</Card>
				<Input id="filled-input" placeholder="Describe another…" />
			</Card>
			<div id="tailwind" />
		</div>
	);
}

const host = document.getElementById("host");
if (!host) throw new Error("kit layout page: no #host");
createRoot(host).render(<Page />);
