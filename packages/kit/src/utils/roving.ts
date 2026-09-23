export type Step = number | "first" | "last";

export function steppedIndex(at: number, step: Step, count: number) {
	if (step === "first") return 0;
	if (step === "last") return count - 1;
	if (at === -1) return step > 0 ? 0 : count - 1;
	return (at + step + count) % count;
}
