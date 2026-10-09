import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Tabs, TabsList, TabsTrigger } from "../packages/kit/src/index";

const TRIGGERS = ["Overview", "Activity", "A much longer settings tab"];
const VARIANTS = [
	["default", undefined],
	["line", "line"],
] as const;

function TwinTabsPage(): ReactElement {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
			{VARIANTS.map(([id, variant]) => (
				<Tabs key={id} id={id} defaultValue={TRIGGERS[0]}>
					<TabsList variant={variant}>
						{TRIGGERS.map((trigger) => (
							<TabsTrigger key={trigger} value={trigger}>
								{trigger}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			))}
		</div>
	);
}

const host = document.getElementById("host");
if (host) createRoot(host).render(<TwinTabsPage />);
