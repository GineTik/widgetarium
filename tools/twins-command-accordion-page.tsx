import { createElement as h, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Command,
	CommandInput,
	CommandMenuInput,
	Input,
	List,
	Questionnaire,
	QuestionnaireChoice,
	QuestionnaireChoices,
	QuestionnaireInput,
	QuestionnaireItem,
	Textarea,
	Row,
	RowLabel,
	Rows,
} from "../packages/kit/src/index";
import { InputGroup, InputGroupInput, NativeSelect, NativeSelectOption } from "../packages/kit/src/exports-inputs";

const QUESTIONS = ["How does sync work?", "Can I undo a delete?", "Where are widgets kept?"];

function MenuInputOfBefore() {
	const [search, setSearch] = useState("");
	return <CommandMenuInput value={search} onValueChange={setSearch} placeholder="Type a command or search…" hint="" />;
}

function Page() {
	useEffect(() => {
		Reflect.set(window, "ready", true);
	}, []);
	return (
		<div style={{ width: "360px", display: "flex", flexDirection: "column", gap: "24px" }}>
			<div id="before">
				<MenuInputOfBefore />
			</div>
			<Command id="command">
				<CommandInput placeholder="Type a command or search…" />
			</Command>
			<Input id="field-twin" placeholder="Field" />
			<div id="focus-rings">
				<Textarea placeholder="Note" />
				<InputGroup>
					<InputGroupInput placeholder="Search" />
				</InputGroup>
				<NativeSelect>
					<NativeSelectOption value="a">A</NativeSelectOption>
				</NativeSelect>
				<Questionnaire>
					<QuestionnaireItem name="pace">
						<QuestionnaireChoices>
							<QuestionnaireChoice value="live">Live</QuestionnaireChoice>
							<QuestionnaireInput aria-label="Describe another" placeholder="Describe another…" />
						</QuestionnaireChoices>
					</QuestionnaireItem>
				</Questionnaire>
			</div>
			<Rows id="rows">
				{QUESTIONS.map((question) => (
					<Rows.Item key={question}>{question}</Rows.Item>
				))}
			</Rows>
			<List id="list">
				<Row>
					<RowLabel>{QUESTIONS[0]}</RowLabel>
				</Row>
			</List>
			<Accordion id="accordion" type="single" collapsible defaultValue={QUESTIONS[0]}>
				{QUESTIONS.map((question) => (
					<AccordionItem key={question} value={question}>
						<AccordionTrigger>{question}</AccordionTrigger>
						<AccordionContent>Every note is written to the vault first.</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}

const host = document.getElementById("host");
if (!host) throw new Error("twins page: no #host");
createRoot(host).render(<Page />);
