import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOpenState } from "../hooks/use-open-state";
import { Command } from "./command";
import { CommandMenuOverlay } from "./command-menu-overlay";

export interface CommandDialogProps {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly title?: string | undefined;
	readonly shouldFilter?: boolean | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

const COMMAND_PALETTE = "Command Palette";

export function CommandDialog({
	open,
	defaultOpen = false,
	onOpenChange,
	title = COMMAND_PALETTE,
	shouldFilter,
	className,
	children,
}: CommandDialogProps): ReactElement | null {
	const [isOpen, setOpen] = useOpenState({ open, defaultOpen, onOpenChange });
	return (
		<CommandMenuOverlay isOpen={isOpen} onClose={() => setOpen(false)}>
			<Command label={title} shouldFilter={shouldFilter} className={className}>
				{children}
			</Command>
		</CommandMenuOverlay>
	);
}
