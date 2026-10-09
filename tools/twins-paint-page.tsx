import { createElement as h, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
	Button,
	ButtonGroup,
	ButtonGroupText,
	Checkbox,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	Input,
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	PopoverItem,
	ProgressBar,
	Questionnaire,
	QuestionnaireChoice,
	QuestionnaireChoices,
	QuestionnaireItem,
	QuestionnaireProgress,
	QuestionnaireTitle,
	RadioGroup,
	RadioGroupItem,
	Slider,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
} from "../packages/kit/src/index";

function Page() {
	useEffect(() => {
		Reflect.set(window, "ready", true);
	}, []);
	return (
		<div style={{ width: "360px", display: "flex", flexDirection: "column", gap: "24px" }}>
			<div style={{ display: "flex", gap: "12px" }}>
				<Checkbox id="checkbox" checked onCheckedChange={() => {}} />
				<Checkbox id="checkbox-off" checked={false} onCheckedChange={() => {}} />
				<RadioGroup defaultValue="b" orientation="horizontal">
					<RadioGroupItem id="radio-off" value="a" />
					<RadioGroupItem id="radio-on" value="b" />
				</RadioGroup>
			</div>
			<div id="progress-slider">
				<ProgressBar value={40} isControlled onChange={() => {}} />
			</div>
			<div id="plain-bar">
				<ProgressBar value={50} />
			</div>
			<Slider id="slider" defaultValue={[40]} />
			<Slider id="range" defaultValue={[20, 70]} />
			<Questionnaire>
				<QuestionnaireProgress id="quiz-progress" />
				<QuestionnaireItem name="pace">
					<QuestionnaireTitle>Pace</QuestionnaireTitle>
					<QuestionnaireChoices>
						<QuestionnaireChoice value="live">Live</QuestionnaireChoice>
					</QuestionnaireChoices>
				</QuestionnaireItem>
			</Questionnaire>
			<div style={{ display: "flex", flexDirection: "column", width: "220px" }}>
				<PopoverItem id="popover-item">Profile</PopoverItem>
			</div>
			<DropdownMenu defaultOpen>
				<DropdownMenuContent>
					<DropdownMenuItem id="menu-item">Profile</DropdownMenuItem>
					<DropdownMenuSeparator id="menu-separator" />
				</DropdownMenuContent>
			</DropdownMenu>
			<NavigationMenu id="nav">
				<NavigationMenuList>
					<NavigationMenuItem value="start">
						<NavigationMenuTrigger id="nav-trigger">Getting started</NavigationMenuTrigger>
						<NavigationMenuContent>
							<NavigationMenuLink id="nav-content-link" href="#intro">
								Introduction
							</NavigationMenuLink>
						</NavigationMenuContent>
					</NavigationMenuItem>
					<NavigationMenuItem value="docs">
						<NavigationMenuLink id="nav-link" href="#docs">
							Docs
						</NavigationMenuLink>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
			<div style={{ display: "flex", gap: "8px" }}>
				<Toggle id="toggle-on" defaultPressed aria-label="Bold">
					B
				</Toggle>
				<Button id="button-accent" variant="accent">
					B
				</Button>
			</div>
			<ToggleGroup id="toggles" type="multiple" defaultValue={["b", "i", "s"]}>
				<ToggleGroupItem value="b">B</ToggleGroupItem>
				<ToggleGroupItem value="i">I</ToggleGroupItem>
				<ToggleGroupItem value="u">U</ToggleGroupItem>
				<ToggleGroupItem value="s">S</ToggleGroupItem>
			</ToggleGroup>
			<ButtonGroup id="buttons">
				<Button variant="outline">Archive</Button>
				<Button variant="outline">Report</Button>
			</ButtonGroup>
			<ButtonGroup id="joined-input">
				<ButtonGroupText>https://</ButtonGroupText>
				<Input placeholder="site" />
			</ButtonGroup>
			<InputOTP id="otp" maxLength={2}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
				</InputOTPGroup>
			</InputOTP>
			<Input id="input" placeholder="Field" />
		</div>
	);
}

const host = document.getElementById("host");
if (host) createRoot(host).render(<Page />);
