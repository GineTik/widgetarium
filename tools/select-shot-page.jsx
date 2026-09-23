import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../packages/kit/src/index.ts";

const FRUITS = ["Apple", "Banana", "Cherry", "Damson", "Elderberry"];

createRoot(document.getElementById("host")).render(
	<div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
		<Select defaultValue="Banana" defaultOpen={true}>
			<SelectTrigger style={{ width: "220px" }}>
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				{FRUITS.map((fruit) => (
					<SelectItem key={fruit} value={fruit}>
						{fruit}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
		<Select>
			<SelectTrigger style={{ width: "220px" }}>
				<SelectValue placeholder="Pick a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="a">Apple</SelectItem>
			</SelectContent>
		</Select>
	</div>,
);
