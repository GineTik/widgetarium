import { READING_KINDS } from "./find-command.js";
import { WIDGET_CHECK_RULES } from "@widgetarium/core/widget-check.js";

export const HELP = `widgets — the Widgetarium catalogue, for the agent

  node widgets.mjs spec <app>           check .widgetarium/apps/<app>/spec.md and show it to the person as a card
  node widgets.mjs stage <app> <stage>  say a build stage is done: data, design, catalogue, widgets, pages
    --said <line>                       what the stage made, in one line
  node widgets.mjs report <app>         every kept feature: built, checked, placed — or what is left
  node widgets.mjs shot <note>          a picture of the note as Obsidian draws it; open the path it prints
    --design <app>                      a picture of the app's design canvas instead
  node widgets.mjs design <app>         check .widgetarium/apps/<app>/design/ and show it to the person as a card
  node widgets.mjs find [options]       every widget, ranked against the data and the hole to fill
  node widgets.mjs install <id>         put an offered widget in this vault, so a board may use it
  node widgets.mjs bases               every base a screen can start from
  node widgets.mjs base <name>         one base: its regions, its sections, ready to write into a note
    --with aside,nav,index,dock         a body: add these shell zones around main
  node widgets.mjs card <name>          one card's parts and the plate it wears, ready to put in a region
  node widgets.mjs show <id>            one widget's manifest and the files it is made of
  node widgets.mjs start <id> --title <words>   say you are building a widget, before its first file
  node widgets.mjs check <id>           a widget's own colours, type, paging and manifest, rule by rule
  node widgets.mjs source <id>          print a widget's component source
  node widgets.mjs packs                the packs, and how many widgets each holds
  node widgets.mjs sources              the catalogue sources this vault reads
  node widgets.mjs layout <note>        the measured layout of a board, region by region
  node widgets.mjs surfaces <note>      which surface every group should wear, law by law, and why
  node widgets.mjs lint <note>          every value, field and nesting in the layout that is not valid

Options for find, none of them a filter — every widget comes back, ranked, with its reasons:
  --role <role>       the role the hole asks for
  --reading <kind>    ${READING_KINDS}

What check names: ${WIDGET_CHECK_RULES.join(", ")}
  --needs <types>     comma-separated field types the data holds, as describes names them
  --about <words>     the subject; this one only lifts a widget's score, it never hides one

  --search <words>    keep only widgets matching these words
  --tag <keyword>     keep only widgets carrying this keyword
  --pack <@pack>      keep only widgets in this pack
  --source <where>    installed | offered | all            (default: all)
  --offset <n>        skip this many                       (default: 0)
  --limit <n>         return at most this many, 1 to 100   (default: 20)
  --text              print a readable table instead of JSON
`;
