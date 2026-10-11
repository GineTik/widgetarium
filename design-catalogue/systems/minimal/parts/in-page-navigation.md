# In-page navigation

Ways to move inside one page.

| Way               | For                                                      | Looks like                                                                         |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Tabs**          | views of the same thing: Overview, Activity, Files       | words under the page title with counts; selected in full ink with a 2px underline  |
| **Contents list** | a long page of sections: a guide, a settings page        | a list in the aside; the section on screen is in full ink while scrolling          |
| **Steps**         | a real sequence: an onboarding, a process, a prompt pack | numbered items (`01`, `02`) only because the order matters; the done ones in ink-3 |
| **Anchors**       | a heading someone may want to link to                    | a link icon appears beside the heading on hover                                    |

- Numbers appear only when the order is real. A list of independent sections is never numbered.
- Tabs never change the page header above them.
- A page with fewer than three sections needs no contents list.
- Kit: `Tabs`, `TabsList`, `TabsTrigger`; the contents list is plain links in the aside.
