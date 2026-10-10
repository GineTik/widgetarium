const TRAFFIC_LIGHTS = ["bg-red", "bg-yellow", "bg-green"] as const;

export function TrafficLights({ isDrawn }: { readonly isDrawn: boolean }) {
	return (
		<span
			className="flex h-11 w-[76px] shrink-0 items-center gap-2 pl-4"
			data-name="macOS window buttons"
			aria-hidden="true"
		>
			{isDrawn ? TRAFFIC_LIGHTS.map((fill) => <span key={fill} className={`size-3 rounded-pill ${fill}`} />) : null}
		</span>
	);
}
