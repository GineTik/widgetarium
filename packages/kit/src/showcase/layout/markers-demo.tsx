import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Marker, MarkerContent, MarkerIcon, Spinner } from "../../index";

export function Markers(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Marker role="status">
				<MarkerIcon>
					<Spinner size={16} />
				</MarkerIcon>
				<MarkerContent className="wg-kit-shimmer">Thinking…</MarkerContent>
			</Marker>
			<Marker>
				<MarkerIcon>
					<Icon name="check" />
				</MarkerIcon>
				<MarkerContent>Explored 4 files</MarkerContent>
			</Marker>
			<Marker variant="border">
				<MarkerIcon>
					<Icon name="git-branch" />
				</MarkerIcon>
				<MarkerContent>Switched to a new branch</MarkerContent>
			</Marker>
			<Marker variant="separator">
				<MarkerContent>Conversation compacted</MarkerContent>
			</Marker>
		</div>
	);
}
