import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface ActionLineProps {
	readonly icon: string;
	readonly said: string;
	readonly isSoon?: boolean;
}

export function ActionLine({ icon, said, isSoon = false }: ActionLineProps): ReactElement {
	return (
		<span className={isSoon ? "wg-studio-action is-soon" : "wg-studio-action"}>
			<Icon name={icon} />
			<span className="wg-studio-action-said">{said}</span>
			{isSoon ? <span className="wg-studio-soon">Soon</span> : null}
		</span>
	);
}
