import { useCallback } from "react";
import type { TailProps } from "./types";

export function useFollowing(following: TailProps["following"]) {
	const isFollowing = following.value !== false;
	const setFollowing = useCallback(
		(wanted: boolean) => {
			if (wanted !== isFollowing) void following.update(wanted);
		},
		[following, isFollowing],
	);
	return { isFollowing, setFollowing };
}
