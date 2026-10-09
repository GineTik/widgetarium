export interface CliOutput {
	out(text: string): void;
	err(text: string): void;
}

export const consoleOutput: CliOutput = {
	out: (text) => console.log(text),
	err: (text) => console.error(text),
};

export class CliRefusal extends Error {}
