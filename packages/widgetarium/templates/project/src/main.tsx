import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { project } from "virtual:widgetarium/project";
import { startWidgetarium } from "virtual:widgetarium/start";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html holds no #root to mount the app in");

createRoot(root).render(<StrictMode>{startWidgetarium(project)}</StrictMode>);
