import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ButtonProps } from "./button";
import { CarouselStep } from "./carousel-step";

export function CarouselPrevious(props: ButtonProps): ReactElement {
	return <CarouselStep {...props} way="previous" />;
}
