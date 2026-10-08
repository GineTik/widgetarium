import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "../../index";

export function PlacedPopover({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<Popover defaultOpen={isOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline">Popover on the right</Button>
			</PopoverTrigger>
			<PopoverContent side="right" align="center" sideOffset={8}>
				<div className="wg-showcase-tight-stack wg-showcase-pad">
					<strong>Dimensions</strong>
					<Input placeholder="Width" />
				</div>
			</PopoverContent>
		</Popover>
	);
}
