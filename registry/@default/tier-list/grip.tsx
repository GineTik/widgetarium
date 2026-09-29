import { Icon } from "widgetarium/kit";

export function Grip({
	variant,
	label,
	icon = "arrow-up",
	isOff = false,
	isTurned = false,
	onPress,
}: {
	variant: string;
	label: string;
	icon?: string;
	isOff?: boolean;
	isTurned?: boolean;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			className={`wr-grip ${variant}`}
			aria-label={label}
			disabled={isOff}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation();
				onPress();
			}}
		>
			<Icon name={icon} size={12} className={isTurned ? "wr-turned" : undefined} />
		</button>
	);
}
