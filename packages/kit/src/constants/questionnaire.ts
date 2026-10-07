export type QuestionStatus = "unanswered" | "answered" | "skipped";

export type ShortcutKind = "letters" | "numbers";

export type QuestionnaireStepKind = "previous" | "skip" | "next" | "submit";

export const CHOICE_INPUT_ATTRIBUTE = "data-questionnaire-choice";

export const TEXT_INPUT_ATTRIBUTE = "data-questionnaire-input";

export const LETTER_SHORTCUTS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const NUMBER_SHORTCUTS = "123456789";

export const PROGRESS_LABEL = "Questionnaire progress";

export const STEP_LABELS: Readonly<Record<QuestionnaireStepKind, string>> = {
	previous: "Back",
	skip: "Skip",
	next: "Next",
	submit: "Submit",
};

export const REQUIRED_ERROR = "Choose an answer to continue.";

export const OPTIONAL_ERROR = "Answer or skip this question to continue.";

export const ANSWER_MOVE_KEYS: Readonly<Record<string, 1 | -1>> = { ArrowDown: 1, ArrowUp: -1 };

export function progressText(current: number, total: number): string {
	return `Question ${current} of ${total}`;
}
