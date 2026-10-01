export function callAsUntypedSource<R>(run: (...args: never[]) => R, ...args: readonly unknown[]): R {
	return Reflect.apply(run, undefined, args);
}

export function constructAsUntypedSource<I>(made: new (...args: never[]) => I, ...args: readonly unknown[]): I {
	return Reflect.construct(made, args);
}
