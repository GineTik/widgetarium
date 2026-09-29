import { Card } from "widgetarium/kit";
import { STYLE } from "./style";

export function Refusal({ why }: { why: string }) {
	return (
		<Card type="group" className="wgc-code is-failed">
			<style>{STYLE}</style>
			<span className="wgc-what">This file cannot be shown as code</span>
			<span className="wgc-why">{why}</span>
		</Card>
	);
}
