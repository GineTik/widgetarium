import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { widgetarium } from "widgetarium/vite";

export default defineConfig({
	plugins: [react(), tailwindcss(), widgetarium()],
});
