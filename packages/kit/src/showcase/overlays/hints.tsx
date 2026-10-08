import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Avatar,
	AvatarFallback,
	Button,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	Icon,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../index";

export function Hints({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<div className="wg-showcase-row">
			<Tooltip defaultOpen={isOpen}>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" aria-label="Add to library">
						<Icon name="plus" size={16} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Add to library</TooltipContent>
			</Tooltip>
			<HoverCard defaultOpen={isOpen}>
				<HoverCardTrigger asChild>
					<Button variant="link">@ada</Button>
				</HoverCardTrigger>
				<HoverCardContent>
					<div className="wg-showcase-row">
						<Avatar label="Ada Lovelace">
							<AvatarFallback>AL</AvatarFallback>
						</Avatar>
						<div className="wg-showcase-tight-stack">
							<strong>Ada Lovelace</strong>
							<span className="wg-showcase-note">Wrote the first program. Joined December 1842.</span>
						</div>
					</div>
				</HoverCardContent>
			</HoverCard>
		</div>
	);
}
