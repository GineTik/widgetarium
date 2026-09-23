import type { LooseProps } from "../types";
import { createElement as h, useState } from "react";
import { Card } from "./card";
import { HEAD_OUTSIDE } from "../constants/layout";

export function RowsWithHeadOutside({ rest, look, children }: LooseProps) {
	const [headPlace, setHeadPlace] = useState(null);
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
