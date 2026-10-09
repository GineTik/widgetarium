import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { project } from "virtual:widgetarium/project";
import { WidgetariumApp, startProject } from "widgetarium/app";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html holds no #root to mount the app in");

const started = startProject(project);

createRoot(root).render(
	<StrictMode>
		<WidgetariumApp project={started} />
	</StrictMode>,
);
