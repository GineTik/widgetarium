import { useCallback } from "react";
import type { TailProps } from "./types";

export function useSetFollowing(isFollowing: boolean, setIsFollowing: TailProps["setIsFollowing"]) {
	return useCallback(
		(wanted: boolean) => {
			if (wanted !== isFollowing) void setIsFollowing(wanted);
		},
		[setIsFollowing, isFollowing],
	);
}
