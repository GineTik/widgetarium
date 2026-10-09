export interface HandlerUser {
	readonly id: string;
}

export interface HandlerHost {
	readonly self: string;
	confirm(said: string): Promise<boolean>;
}

export interface HandlerContext<Host extends HandlerHost = HandlerHost> {
	readonly user: HandlerUser | null;
	readonly signal: AbortSignal;
	readonly host: Host;
}

const PORTS_SHUT = "ports are not available to {name}";

export function shutHostFor(name: string): HandlerHost {
	const refusal = (): Promise<never> => Promise.reject(new Error(PORTS_SHUT.replace("{name}", name)));
	return { self: name, confirm: refusal };
}

export function handlerContextOf<Host extends HandlerHost>(host: Host, signal: AbortSignal): HandlerContext<Host> {
	// TODO: auth packs hand the signed-in user
	return { user: null, signal, host };
}
