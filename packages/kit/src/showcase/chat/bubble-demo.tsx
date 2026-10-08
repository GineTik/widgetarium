import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions, Icon } from "../../index";
import type { BubbleVariant } from "../../index";
import { Named } from "../frame/named";

export const VARIANTS: readonly BubbleVariant[] = [
	"default",
	"secondary",
	"muted",
	"tinted",
	"outline",
	"ghost",
	"destructive",
];

export function BubbleDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			{VARIANTS.map((variant) => (
				<Named key={variant} name={variant}>
					<Bubble variant={variant}>
						<BubbleContent>The draft is ready for review.</BubbleContent>
					</Bubble>
				</Named>
			))}
			<Named name="BubbleGroup · BubbleReactions · align end">
				<BubbleGroup>
					<Bubble align="end">
						<BubbleContent>Shipped on Friday.</BubbleContent>
					</Bubble>
					<Bubble align="end">
						<BubbleContent render={<button type="button" />}>Open the release note</BubbleContent>
						<BubbleReactions role="img" aria-label="Two thumbs up">
							<Icon name="thumbs-up" size={12} /> 2
						</BubbleReactions>
					</Bubble>
				</BubbleGroup>
			</Named>
		</div>
	);
}
