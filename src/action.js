import { useCallback, useMemo, useState } from "preact/hooks";

export function createAction({ can = true, blockedReason = null, run }) {
	return { can, blockedReason, run };
}

export function useAction(action) {
	const [state, setState] = useState({ isLoading: false, error: null });

	const run = useCallback(
		async (payload) => {
			setState({ isLoading: true, error: null });
			try {
				const result = await action.run(payload);
				setState({ isLoading: false, error: null });
				return { isBlocked: false, blockedReason: null, result };
			} catch (failure) {
				setState({ isLoading: false, error: failure });
				return { isBlocked: false, blockedReason: null, result: null, error: failure };
			}
		},
		[action],
	);

	const runIfCan = useCallback(
		async (payload) => {
			if (!action.can) return { isBlocked: true, blockedReason: action.blockedReason, result: null };
			return run(payload);
		},
		[action, run],
	);

	return useMemo(
		() => ({
			can: action.can,
			blockedReason: action.blockedReason,
			run,
			runIfCan,
			isLoading: state.isLoading,
			error: state.error,
		}),
		[action, run, runIfCan, state],
	);
}
