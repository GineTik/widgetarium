import { ActionButton, Button, ButtonLabel, IconButton, ShowMore, Spinner } from "./components/button";
import { Badge, Count, Pill } from "./components/badge";

import { Calendar } from "./components/calendar";
import { Card, Plate, Surface } from "./components/card";

import { Emblem, EmblemDiceBear, EmblemFallback, EmblemImage, PlaceholderMark } from "./components/emblem";
import { Field, MarkdownEditor, TextArea } from "./components/field";
import { CodeBlock } from "./components/code-block";
import { Grid, Layout, LayoutActions, LayoutHeader, LayoutItem, LayoutTitle } from "./components/layout";
import { Heading } from "./components/heading";

import { List, Row, RowBadge, RowLabel, RowSupporting, RowText, RowValue, SlotList } from "./components/list";
import { Page } from "./components/page";
import { Container } from "./components/container";
import { Section } from "./components/section";

import {
	Popover,
	PopoverContent,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	PopoverTrigger,
} from "./components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";

import { Progress, ProgressBar, StatusProgress } from "./components/progress";
import { ProgressRing } from "./components/progress-ring";

import { Segmented } from "./components/segmented";
import { Tabs } from "./components/tabs";
import { Loader } from "./components/loader";

import { Sidebar, SidebarGroup, SidebarRow, SidebarSheet } from "./components/sidebar";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./components/pagination";

import { Skeleton } from "./components/skeleton";

import { DataTable } from "./components/data-table";

import { Sparkline, SparklineArea, SparklineBars, SparklineDot, SparklineLine } from "./components/sparkline";

import { Switch } from "./components/switch";
import { Checkbox } from "./components/checkbox";
import { ArtObject } from "./components/art-object";
import { ArtField } from "./components/art-field";
import { Confetti } from "./components/confetti";
import { PhotoStack } from "./components/photo-stack";
import { Shape } from "./shapes/shape";
import { CommandMenu } from "./components/command-menu";
import { CommandMenuOverlay } from "./components/command-menu-overlay";
import { Dialog } from "./components/dialog";
import { CommandMenuInput } from "./components/command-menu-input";
import { CommandMenuSection } from "./components/command-menu-section";
import { CommandMenuItem } from "./components/command-menu-item";
import { EmptyState } from "./components/empty-state";
import { PhotoCard } from "./components/photo-card";
import { Hero } from "./components/hero";
import { SHAPE_NAMES } from "./shapes/shape-names";
import { FormFields } from "./components/form-fields";
import { FORM_FIELD_KINDS, changedValues, draftOfRecord, isDraftComplete, valuesOfDraft } from "./utils/form-fields";

import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./components/table";

import { LAYOUT_KINDS } from "./constants/layout";
import { MARK_SHAPE_NAMES, MARK_TONE_NAMES } from "./constants/marks";
import { APPROVAL_TONES, BADGE_COLORS, BADGE_VARIANTS, PRIORITY_TONES, TONE_NAMES } from "./constants/tones";
import { useRoomForLabel } from "./hooks/use-room-for-label";
import { useSegmentedThumb } from "./hooks/use-segmented-thumb";
import { Icon } from "./icons/icon";
import {
	buttonClass,
	cardClass,
	fieldClass,
	glassClass,
	iconButtonClass,
	listClass,
	pillClass,
	plateClass,
	rowClass,
	sidebarClass,
} from "./utils/class-names";
import { cn, variants } from "./utils/cn";
import { markOf } from "./utils/marks";
import { progressState } from "./utils/progress";
import { barGeometry, circleGeometry } from "./utils/progress-geometry";
import { inkedClass, toneClass, toneOf } from "./utils/tones";
import { Ceiling, COUNTED_CEILING, countedFirstLine } from "./components/ceiling";
import { DiffBar } from "./components/diff-bar";
import { FLAME, Flame } from "./components/flame";
import { Line } from "./components/line";
import { MoreWhenSeen } from "./components/more-when-seen";
import { RenderedMarkdown } from "./components/rendered-markdown";
import { useRendersMarkdownInto } from "./hooks/use-renders-markdown-into";
import { useNow } from "./hooks/use-now";
import { usePages } from "./hooks/use-pages";
import { useScrollFog } from "./hooks/use-scroll-fog";
import { useShown } from "./hooks/use-shown";
import { useWhenSeen } from "./hooks/use-when-seen";
import { SHADCN_PARTS } from "./kit-object-shadcn";

export const Kit = {
	Sidebar,
	sidebarClass,
	SidebarSheet,
	SidebarGroup,
	SidebarRow,
	cn,
	cx: cn,
	variants,
	Button,
	ButtonLabel,
	IconButton,
	Badge,
	Spinner,
	Emblem,
	EmblemImage,
	EmblemDiceBear,
	EmblemFallback,
	ActionButton,
	Tabs,
	BADGE_VARIANTS,
	BADGE_COLORS,
	Heading,
	Pill,
	ShowMore,
	Count,
	Plate,
	Card,
	Surface,
	Layout,
	LayoutHeader,
	LayoutTitle,
	LayoutActions,
	LayoutItem,
	Grid,
	LAYOUT_KINDS,
	SlotList,
	List,
	Row,
	RowBadge,
	RowLabel,
	RowText,
	RowSupporting,
	Page,
	Container,
	Section,
	RowValue,
	Field,
	TextArea,
	fieldClass,
	Icon,
	PlaceholderMark,
	markOf,
	MARK_SHAPE_NAMES,
	MARK_TONE_NAMES,
	PRIORITY_TONES,
	APPROVAL_TONES,
	TONE_NAMES,
	toneOf,
	toneClass,
	Segmented,
	Loader,
	useSegmentedThumb,
	useRoomForLabel,
	Popover,
	PopoverTrigger,
	PopoverContent,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	PopoverItem,
	PopoverSearch,
	PopoverSeparator,
	Calendar,
	Progress,
	ProgressBar,
	ProgressRing,
	StatusProgress,
	inkedClass,
	barGeometry,
	circleGeometry,
	progressState,
	MarkdownEditor,
	CodeBlock,
	Sparkline,
	SparklineArea,
	SparklineBars,
	SparklineDot,
	SparklineLine,
	Skeleton,
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableRow,
	TableHead,
	TableCell,
	TableCaption,
	DataTable,
	Switch,
	Checkbox,
	ArtObject,
	ArtField,
	Confetti,
	PhotoStack,
	Shape,
	CommandMenu,
	CommandMenuOverlay,
	Dialog,
	CommandMenuInput,
	CommandMenuSection,
	CommandMenuItem,
	EmptyState,
	PhotoCard,
	Hero,
	SHAPE_NAMES,
	FormFields,
	FORM_FIELD_KINDS,
	changedValues,
	draftOfRecord,
	isDraftComplete,
	valuesOfDraft,
	buttonClass,
	iconButtonClass,
	pillClass,
	plateClass,
	cardClass,
	listClass,
	rowClass,
	glassClass,
	Ceiling,
	COUNTED_CEILING,
	countedFirstLine,
	DiffBar,
	FLAME,
	Flame,
	Line,
	MoreWhenSeen,
	RenderedMarkdown,
	useRendersMarkdownInto,
	useNow,
	usePages,
	useScrollFog,
	useShown,
	useWhenSeen,
	...SHADCN_PARTS,
};
