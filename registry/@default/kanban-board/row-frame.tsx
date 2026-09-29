import { SidebarRow } from "widgetarium/kit";
import type { ReactNode } from "react";
import { Glyph } from "./glyph";
import type { Anchor } from "./types";

type RowFrameProps = {
	anchor: Anchor;
	name: string;
	unset: boolean;
	children: ReactNode;
	isOpen?: boolean;
	asButton?: boolean;
	onClick?: () => void;
};

export function RowFrame({ anchor, name, unset, isOpen, children, asButton, onClick }: RowFrameProps) {
	return (
		<SidebarRow
			as={asButton ? "button" : "div"}
			className="otd-row"
			icon={<Glyph name={anchor.icon} />}
			label={name}
			unset={unset}
			isOpen={isOpen}
			onClick={onClick}
		>
			{children}
		</SidebarRow>
	);
}
