import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Grid, Skeleton } from "../../index";
import { Cell } from "../frame/cell";
import { SKELETON_SHOWN } from "../showcase-data";

const SKELETON_SIZES = ["s", "m", "l", "xl"];

export function SkeletonsDemo(): ReactElement {
	return (
		<Grid min={320}>
			<Cell name='kind="block"'>
				<Skeleton style={{ height: "64px" }} />
			</Cell>
			<Cell name='kind="emblem" · size s m l xl'>
				<div className="wg-showcase-row wg-showcase-bottom">
					{SKELETON_SIZES.map((size) => (
						<Skeleton key={size} kind="emblem" size={size} />
					))}
					<Skeleton kind="emblem" size="l" shape="rounded" />
				</div>
			</Cell>
			<Cell name='kind="button" · size s m l'>
				<div className="wg-showcase-row">
					<Skeleton kind="button" size="s" />
					<Skeleton kind="button" />
					<Skeleton kind="button" size="l" />
				</div>
			</Cell>
			{SKELETON_SHOWN.map(({ kind, props }) => (
				<Cell key={kind} name={`kind="${kind}"`}>
					<Skeleton kind={kind} {...props} />
				</Cell>
			))}
		</Grid>
	);
}
