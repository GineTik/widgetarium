import { useId, useRef } from "react";
import type { FocusIntent, MenuState } from "../components/menu-context";
import { useMenu } from "../components/menu-context";
import { boxOf } from "../utils/floating-placement";
import { useControllableState } from "./use-controllable-state";

export interface MenuSubAsk {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
}

export function useMenuSub({ open, defaultOpen, onOpenChange }: MenuSubAsk): MenuState {
	const parent = useMenu();
	const [isOpen, setOpen] = useControllableState({
		prop: open,
		defaultProp: defaultOpen ?? false,
		onChange: onOpenChange,
	});
	const triggerRef = useRef<HTMLElement>(null);
	const focusIntent = useRef<FocusIntent>("none");
	const childCloser = useRef<(() => void) | null>(null);
	const closeSelf = useRef(() => {
		childCloser.current?.();
		setOpen(false);
	});
	const contentId = useId();
	return {
		...parent,
		isOpen,
		setOpen: (next) => {
			if (next) openAlone(parent, closeSelf.current);
			setOpen(next);
		},
		contentId,
		triggerRef,
		anchorBox: boxOf(triggerRef),
		focusIntent,
		childCloser,
		parent,
	};
}

function openAlone(parent: MenuState, closeSelf: () => void): void {
	if (parent.childCloser.current !== closeSelf) parent.childCloser.current?.();
	parent.childCloser.current = closeSelf;
}
