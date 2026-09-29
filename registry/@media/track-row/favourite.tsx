import { Icon, IconButton } from "widgetarium/kit";

const ADD_TO_FAVOURITES = "Add to favourites";
const REMOVE_FROM_FAVOURITES = "Remove from favourites";

export function Favourite({ isOn, onPress }: { isOn: boolean; onPress: () => void }) {
	return (
		<IconButton
			className="mt-fav"
			size="s"
			variant="ghost"
			data-on={isOn ? "" : undefined}
			aria-pressed={isOn ? "true" : "false"}
			label={isOn ? REMOVE_FROM_FAVOURITES : ADD_TO_FAVOURITES}
			onClick={(event: { stopPropagation(): void }) => {
				event.stopPropagation();
				onPress();
			}}
		>
			<Icon name="heart" size={15} />
		</IconButton>
	);
}
