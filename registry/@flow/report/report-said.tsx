import { CSS } from "./style";

export function ReportSaid({ text }: { text: string }) {
	return (
		<>
			<style>{CSS}</style>
			<p className="flow-report-said">{text}</p>
		</>
	);
}
