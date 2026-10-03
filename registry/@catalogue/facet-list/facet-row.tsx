import type { PropsOf } from "widgetarium";
import { Icon, SidebarRow } from "widgetarium/kit";
import type { Facet } from "./types";
import type FacetList from "./widget";

interface FacetRowProps {
	readonly facet: Facet;
	readonly picked: string;
	readonly select: PropsOf<typeof FacetList>["select"];
}

export function FacetRow({ facet, picked, select }: FacetRowProps) {
	const isOn = picked === facet.name;
	return (
		<SidebarRow
			as="button"
			className={facet.tone ? `wg-catalogue-facet is-${facet.tone}` : "wg-catalogue-facet"}
			icon={iconOf(facet)}
			label={facet.label}
			value={facet.count === undefined ? undefined : String(facet.count)}
			selected={isOn}
			onClick={() => void select(isOn ? null : facet.name)}
		/>
	);
}

function iconOf(facet: Facet) {
	if (facet.icon) return <Icon name={facet.icon} size={14} />;
	return <span className="wg-catalogue-facet-mark">{facet.mark ?? facet.label.charAt(0).toUpperCase()}</span>;
}
