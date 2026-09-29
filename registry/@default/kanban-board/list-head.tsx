import { Count, Icon } from "widgetarium/kit";
import { blurOnEnterRestoreOnEscape } from "./blur-on-enter";

type ListHeadProps = {
	title: string;
	count: number;
	onArchive?: (() => void) | undefined;
	onRename?: ((name: string | null) => void) | undefined;
	onRenaming: (isRenaming: boolean) => void;
};

export function ListHead({ title, count, onArchive, onRename, onRenaming }: ListHeadProps) {
	return (
		<>
			<span
				className="ok-list-title"
				contentEditable={onRename ? "true" : undefined}
				suppressContentEditableWarning
				onFocus={() => onRenaming(true)}
				onKeyDown={blurOnEnterRestoreOnEscape(title)}
				onBlur={(event) => {
					onRenaming(false);
					onRename?.(event.currentTarget.textContent);
				}}
			>
				{title}
			</span>
			<Count>{count}</Count>
			{onArchive ? (
				<button type="button" className="ok-list-remove" title={`Archive ${title}`} onClick={onArchive}>
					<Icon name="archive" size={15} />
				</button>
			) : null}
		</>
	);
}
