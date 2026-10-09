import { Card } from "widgetarium/kit";

const APP_NAME = "{name}";

export function App() {
	return (
		<main className="min-h-screen bg-page p-6 text-ink">
			<Card>{APP_NAME}</Card>
		</main>
	);
}
