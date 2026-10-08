import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, ScrollArea } from "../../index";
import { Named } from "../frame/named";

export const TAGS = Array.from({ length: 24 }, (_, at) => `v1.2.0-beta.${24 - at}`);

export function Scrolling(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Named name="ScrollArea fade · thin thumb on hover">
				<Card>
					<ScrollArea fade type="always" style={{ height: "176px" }}>
						<div className="wg-showcase-stack">
							{TAGS.map((tag) => (
								<span key={tag} className="wg-showcase-code">
									{tag}
								</span>
							))}
						</div>
					</ScrollArea>
				</Card>
			</Named>
			<Named name="className wg-kit-shimmer · Tailwind shimmer">
				<span className="wg-kit-shimmer">Reading 4 files…</span>
			</Named>
		</div>
	);
}
