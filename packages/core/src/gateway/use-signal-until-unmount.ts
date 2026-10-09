import { useEffect, useMemo, useState } from "react";
import { handlerContextOf } from "./handler-context";
import type { HandlerContext, HandlerHost } from "./handler-context";

export function useSignalUntilUnmount(): AbortSignal {
	const [controller, setController] = useState(() => new AbortController());
	useEffect(() => {
		if (controller.signal.aborted) setController(new AbortController());
		return () => controller.abort();
	}, [controller]);
	return controller.signal;
}

export function useHandlerContext(host: HandlerHost): HandlerContext {
	const signal = useSignalUntilUnmount();
	return useMemo(() => handlerContextOf(host, signal), [host, signal]);
}
