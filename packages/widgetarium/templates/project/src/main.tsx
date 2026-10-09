import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html holds no #root to mount the app in");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
