import { READING_KINDS } from "./find-command.js";
import { WIDGET_CHECK_RULES } from "@widgetarium/core/widget-check.js";

export const HELP = `widgets — the Widgetarium catalogue, for the agent

  node widgets.mjs spec <app>           check .widgetarium/apps/<app>/spec.md and show it to the person as a card
  node widgets.mjs stage <app> <stage>  say a build stage is done: data, design, catalogue, widgets, pages
    --said <line>                       what the stage made, in one line
  node widgets.mjs jobs <app>           every job of the app: its status, what it said, what it asks, what it owns
  node widgets.mjs job add <app>        plan one job; the plugin runs it in a session of its own
    --title <words>                     the job as the person reads it: "Design the People page"
    --phase design|implement|review|task   which stages it runs
    --page <name>                       the spec page it works on; its tab on the canvas shows the job
    --says <instructions>               everything it needs and nothing else
    --after id,id                       jobs that must be done before it starts
    --approval                          the person approves it on the canvas before what comes after starts
    --budget <tokens>                   it pauses once it has written this many tokens
  node widgets.mjs job note <app> <id> <text>    a correction the job reads before it goes on
  node widgets.mjs job ask <app> <id> <question> --options A,B,C   from inside a job: ask the person, then end the turn
  node widgets.mjs job answer <app> <id> <reply> pass the person's reply to a job that asked; Approve approves
  node widgets.mjs job stop|start <app> <id>     stop a job, or start one now
  node widgets.mjs report <app>         every kept feature: built, checked, placed — or what is left
  node widgets.mjs shot <note>          a picture of the note as Obsidian draws it; open the path it prints
    --design <app>                      a picture of the app's design canvas instead
  node widgets.mjs design <app>         check .widgetarium/apps/<app>/design/ and show it to the person as a card
  node widgets.mjs reference <app> <url>   put a picture from the web on the canvas, above the screens
    --why <line>                        what to take from it, shown under the picture
    --kind app|site|marketing|photo     what the picture is: a product screen, a website, marketing art, a photo
    --page People,Person                the screens it informs; left out, it stands on every screen's page
  node widgets.mjs note <app> <reference> <text>   a sticky note beside a reference: what you take, like or leave
    --tone take|like|dislike|note       its colour
    --at 0.4,0.2                        the point on the picture it is about, from the top left
    --into @scope/name                  a take or like that became a widget: the note gets a button to it
  node widgets.mjs photos <app>         after Approve design: download the photos the screens use
  node widgets.mjs rules <app>          every design rule in force for the app, to check the canvas against
  node widgets.mjs screen <app> <screen>   write one screen of the design canvas: its note and its place in canvas.json
    --widget @<app>/<page>-page         the page widget that draws this screen
    --set state=empty,dialog=add        values its props read (getState, getDialog, …)
    --board                             or: place a board you wrote at design/<screen>[ · <state>].md
    --state <name>                      a state of that screen: Empty, a dialog open, …
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
