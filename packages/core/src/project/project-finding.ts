export interface ProjectFinding {
	readonly path: string;
	readonly message: string;
}

export function formatFindings(findings: readonly ProjectFinding[]): string {
	return findings.map(({ path, message }) => `${path}: ${message}`).join("\n");
}
