const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDaySaid(iso: string): string {
	const parts = iso.split("-");
	return `${parts[2] ?? ""} ${MONTHS[Number(parts[1]) - 1] ?? ""}`;
}

export function dateOf(iso: string): Date {
	return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

export function isoFrom(at: Date): string {
	const month = String(at.getMonth() + 1).padStart(2, "0");
	return `${at.getFullYear()}-${month}-${String(at.getDate()).padStart(2, "0")}`;
}

export function slotOf(day: string, from: string): number {
	return Math.round((dateOf(day).getTime() - dateOf(from).getTime()) / 86400000);
}
