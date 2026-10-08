import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Questionnaire,
	QuestionnaireActions,
	QuestionnaireChoice,
	QuestionnaireChoices,
	QuestionnaireDescription,
	QuestionnaireError,
	QuestionnaireInput,
	QuestionnaireItem,
	QuestionnaireNext,
	QuestionnairePrevious,
	QuestionnaireProgress,
	QuestionnaireSkip,
	QuestionnaireSubmit,
	QuestionnaireTitle,
} from "../../index";

export function QuestionnaireDemo(): ReactElement {
	const [sent, setSent] = useState("");
	return (
		<div className="wg-showcase-stack">
			<Questionnaire
				shortcuts="letters"
				onSubmit={(event) => {
					event.preventDefault();
					setSent(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
				}}
			>
				<QuestionnaireProgress />
				<QuestionnaireItem name="pace" required>
					<QuestionnaireTitle>How fast should the board refresh?</QuestionnaireTitle>
					<QuestionnaireDescription>Pick the one that matches how you work.</QuestionnaireDescription>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="live" description="Every change shows at once">
							Live
						</QuestionnaireChoice>
						<QuestionnaireChoice value="hourly">Every hour</QuestionnaireChoice>
						<QuestionnaireChoice value="daily">Once a day</QuestionnaireChoice>
						<QuestionnaireInput aria-label="Describe another" placeholder="Describe another…" />
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireItem name="views" multiple>
					<QuestionnaireTitle>Which views do you open most?</QuestionnaireTitle>
					<QuestionnaireDescription>Pick as many as you like, or skip.</QuestionnaireDescription>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="board">Board</QuestionnaireChoice>
						<QuestionnaireChoice value="calendar">Calendar</QuestionnaireChoice>
						<QuestionnaireChoice value="list">List</QuestionnaireChoice>
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireItem name="note" required>
					<QuestionnaireTitle>Anything else?</QuestionnaireTitle>
					<QuestionnaireChoices>
						<QuestionnaireInput aria-label="Your note" placeholder="Write a line…" />
					</QuestionnaireChoices>
					<QuestionnaireError />
				</QuestionnaireItem>
				<QuestionnaireActions>
					<QuestionnairePrevious />
					<QuestionnaireSkip />
					<QuestionnaireNext />
					<QuestionnaireSubmit />
				</QuestionnaireActions>
			</Questionnaire>
			{sent ? <p className="wg-showcase-code">{sent}</p> : null}
		</div>
	);
}
