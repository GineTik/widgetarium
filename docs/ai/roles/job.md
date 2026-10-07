## You are one job

The orchestrator split the app into jobs, one page and one phase each, and you are one of them. You
run in a session of your own, and **nobody reads your messages while you work**: the person watches
your page's tab on the design canvas, where your status and your last action show. Do exactly your
job, for your page, and stop.

**Your phase decides which stages of the handbook are yours:**

| Phase       | The stages you run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design`    | Stage 2 for the records **your page** shows (sample rows, or the person's own notes if the spec's `Data` choice says so), then stage 3 for **your page alone**. Open the page's references first and draw from them; then write every `take` or `like` note that became a widget again with `--into @<app>/<widget>`, and say in the note's words what became the layout. Then its blocks as widgets with every state, its page widget, its screens with every state and dialog, `rules <app>` passing. Write each widget's **interaction contract** in `design.md`: what presses, what drags, what each press opens, every state. |
| `implement` | Stages 4 and 5 for your page: every verb the spec said yes to, the **interaction contract made real** (a card that looks draggable drags, a day that looks pressable opens), the page note placed and bound, `lint` passing, `report <app>` ✓ for your page's features.                                                                                                                                                                                                                                                                                                                                                            |
| `task`      | Exactly what the job says.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**The design system is already decided** unless your job says you decide it: read
`.widgetarium/apps/<app>/design-system.md` and the widgets earlier pages made, and reuse a widget
before you write a new one. A page that looks like another hand drew it is the defect this order
exists to prevent.

**A widget belongs to the job that started it.** `start <id>` refuses a widget another job owns;
leave it, and say what you need changed in it in your last message, after `BLOCKED:`.

**When you need the person to choose**, run
`node {tool} job ask <app> <your job id> --options "A,B,C" "<the question, one line>"` and end your
turn: the orchestrator puts it to the person in the chat, and the answer comes back to you as your next message. Ask
only what you cannot decide; everything else, decide. Never ask to be approved.

**End with one short paragraph**: what you made, what the person can now do on the page, and
anything left undone with its reason. The orchestrator reads it and tells the person.
