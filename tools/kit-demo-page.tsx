import "./packs-registered.ts";
import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Heading, Layout, LayoutActions, LayoutHeader, ToggleGroup, ToggleGroupItem } from "../packages/kit/src/index";
import { SHOWCASE, openedFromHash } from "../packages/kit/src/showcase/index";
import { ShowcaseSections } from "./kit-demo-sections.tsx";

const THEMES = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
];

function ThemeSwitch() {
	const [theme, setTheme] = useState(
		document.documentElement.dataset["theme"] ??
			(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
	);
	const choose = (next: string): void => {
		if (!next) return;
		document.documentElement.dataset["theme"] = next;
		setTheme(next);
	};
	return (
		<ToggleGroup type="single" variant="outline" value={theme} onValueChange={choose} aria-label="Theme">
			{THEMES.map((item) => (
				<ToggleGroupItem key={item.value} value={item.value}>
					{item.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

function Demo() {
	return (
		<Layout kind="stack" className="demo-page wg-showcase">
			<LayoutHeader className="demo-head">
				<div>
					<Heading level={1}>Widgetarium kit</Heading>
					<p className="wg-showcase-note">Every component drawn from the kit itself, on the kit's own tokens.</p>
				</div>
				<LayoutActions>
					<ThemeSwitch />
				</LayoutActions>
			</LayoutHeader>
			<ShowcaseSections entries={SHOWCASE} opened={openedFromHash(location.hash)} />
		</Layout>
	);
}

const demoHost = document.getElementById("demo");
if (!demoHost) throw new Error("kit demo: the page has no #demo");
createRoot(demoHost).render(<Demo />);
