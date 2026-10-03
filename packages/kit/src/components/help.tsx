import { createElement as h, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useHoverOpen } from "../hooks/use-hover-open";
import { Icon } from "../icons/icon";
import { IconButton } from "./icon-button";
import { Popover } from "./popover";

export interface HelpProps {
	readonly children?: ReactNode;
	readonly label?: string | undefined;
}

const WHAT_IS_THIS = "What is this?";

export function Help({ children, label = WHAT_IS_THIS }: HelpProps): ReactElement | null {
	const [isOpen, setOpen] = useState(false);
	const hover = useHoverOpen(setOpen);
	if (children === null || children === undefined || children === "") return null;
	return (
		<span
			className="wg-kit-help"
			onClick={(event: MouseEvent) => {
				event.stopPropagation();
				hover.forgetHover();
			}}
			onPointerEnter={hover.onPointerEnter}
			onPointerLeave={hover.onPointerLeave}
		>
			<Popover
				open={isOpen}
				onOpenChange={setOpen}
				placement="below"
				isPortaled
				className="wg-kit-help-pop"
				trigger={
					<IconButton
						size="s"
						label={label}
						className="wg-kit-help-button"
						aria-expanded={isOpen}
						aria-description={typeof children === "string" ? children : undefined}
					>
						<Icon name="circle-question-mark" />
					</IconButton>
				}
			>
				<p className="wg-kit-help-text">{children}</p>
			</Popover>
		</span>
	);
}
