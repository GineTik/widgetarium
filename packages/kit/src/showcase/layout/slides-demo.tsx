import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, Shape } from "../../index";

export const SLIDES = ["Morning pages", "Reading list", "Weekly review", "Ideas"];

export function Slides(): ReactElement {
	return (
		<Carousel opts={{ loop: true }}>
			<CarouselContent>
				{SLIDES.map((title, at) => (
					<CarouselItem key={title}>
						<Card>
							<div className="wg-showcase-slide">
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
