import { compileWidget } from "./widget-build.js";

export function moduleFromCompiled(code, { require = () => null, globals = {} } = {}) {
	const shell = { exports: {} };
	new Function("require", "module", "exports", ...Object.keys(globals), code)(require, shell, shell.exports, ...Object.values(globals));
	return shell.exports;
}

export function moduleFromBundle(source, path) {
	return moduleFromCompiled(compileWidget(source, path));
}
