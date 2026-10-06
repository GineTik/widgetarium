export function todayIso(now: Date = new Date()): string {
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

export function msUntilTomorrow(now: Date = new Date()): number {
	const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return tomorrow.getTime() - now.getTime();
}
