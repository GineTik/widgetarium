import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { HEAD_OUTSIDE } from "../constants/layout";
import { Card } from "./card";
import type { LayoutDivProps, LayoutLook } from "./layout";

export interface RowsWithHeadOutsideProps {
	readonly rest: LayoutDivProps;
	readonly look: LayoutLook;
	readonly children: ReactNode;
}

export function RowsWithHeadOutside({ rest, look, children }: RowsWithHeadOutsideProps): ReactElement {
	const [headPlace, setHeadPlace] = useState<HTMLElement | null>(null);
	return (
		<div className="wg-kit-layout-block">
			<div ref={setHeadPlace} className="wg-kit-layout-heads" />
			<HEAD_OUTSIDE.Provider value={headPlace}>
				<Card {...rest} {...look}>
					{children}
				</Card>
			</HEAD_OUTSIDE.Provider>
		</div>
	);
}
