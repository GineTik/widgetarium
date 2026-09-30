import { compileWidget } from "./widget-build.js";

export type RequireModule = (name: string) => unknown;

export interface ModuleOptions {
	readonly require?: RequireModule;
	readonly globals?: Readonly<Record<string, unknown>>;
}

export interface ModuleShell {
	exports: unknown;
}

export function moduleFromCompiled(code: string, { require = () => null, globals = {} }: ModuleOptions = {}): unknown {
	const shell: ModuleShell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(globals), code)(
		require,
		shell,
		shell.exports,
		...Object.values(globals),
	);
	return shell.exports;
}

export function moduleFromBundle(source: string, path: string): unknown {
	return moduleFromCompiled(compileWidget(source, path));
}
