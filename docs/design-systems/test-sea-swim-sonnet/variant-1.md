# Sea swim, variant 1: Depth

## Fit (Step 0)

| Parameter         | Brief                                                    | Verdant        | Gallery       | Cloud                             |
| ----------------- | -------------------------------------------------------- | -------------- | ------------- | --------------------------------- |
| Centre of gravity | information (conditions) + journey (season)              | object         | object        | atmosphere over light information |
| Photogenic domain | user photos (design photos only for empty states, spots) | yes            | user photos   | no                                |
| Session           | glance (Today) + browse (Journal)                        | browse, glance | browse        | glance                            |
| Density           | medium                                                   | high           | low           | low                               |
| Tone              | calm, resolute, cold                                     | energetic      | calm, premium | calm                              |
| Device            | both (phone on the shore, desktop at home)               | phone          | both          | phone                             |

Match: Gallery 4 (photogenic, session, tone, device), Cloud 3 to 4 (centre, session, tone, density), Verdant 1 to 2 (session). All three are used; Verdant mostly for colour logic, controls and instruments.

Dropped conditional traits (brief does not meet the condition):

- Verdant `V-I2`, `V-L1`, `V-L2`, `V-L3`: centre is not an object, photos are not the subject.
- Verdant `V-M1`, `V-M2`, `V-M3`: photogenic = yes not met, photos are the user's.
- Verdant `V-D1`: density is medium, not high.
- Cloud `K-C4`: no owned object to carry a saturated plate.
- Cloud `K-D1`: density is medium, not low.

Kept because met: `V-S1`, `V-F2` (Spots map), `G-M1..M4`, `G-S1`, `G-L3`, `G-D1`, `G-I2`, `K-I2`, `K-M1`, `K-M3`, `K-L1`, `K-L2`, `K-X1`, `K-S1`, `K-S2`.

## Idea

The water is the page: the ground is a sea picture whose depth follows today's water temperature, and every swim you log surfaces out of it as a fog-edged photo.

## Traits

| Category    | Trait taken                                                                | Why                                                              |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Idea        | `K-I2` the picture carries a meaning: depth of water = today's temperature | the one number a swimmer checks first becomes the whole mood     |
| Idea        | `G-I2` one page, one task                                                  | Today answers one question: go or no-go                          |
| Colour      | `K-C2` pastel, cool picture; hue free, here sea-glass 200                  | cold water reads cool by nature                                  |
| Colour      | `K-C3` steps: picture, mist, white sheet, ink, grey, small cool deltas     | gives the picture a job and keeps UI neutral                     |
| Colour      | `G-C5` most text is grey, not black                                        | calm comes from type colour; numbers stay ink                    |
| Imagery     | `K-M1` the picture forms the design                                        | role: images form the design                                     |
| Imagery     | `K-M3` abstract water only, one kind across the app                        | a subject would fight the swimmer's own photos                   |
| Imagery     | `G-M1` swim photos are user content, obeying the design                    | brief: any phone photo, any light                                |
| Imagery     | `G-M3` every photo dissolves into mist at its foot                         | same fade as the ground: one material                            |
| Imagery     | `G-M4` the fog makes any user photo fit                                    | a loud sunset and a dull grey day sit side by side               |
| Layout      | `K-L1` the picture is the ground of every screen                           | the idea itself                                                  |
| Layout      | `G-L5` the bottom of the screen fades into mist                            | scrolling content rises out of the water                         |
| Surfaces    | `K-S2` one white drawer sheet for what must be read (journal, log)         | only readable text gets a plate                                  |
| Surfaces    | `V-S2` depth by tone on tone, never shadow                                 | a shadow would read as a hard object on water                    |
| Controls    | `V-K1` rounded squares of blurred white on the picture; pills on light     | two grounds, two families                                        |
| Controls    | `G-K1` small pills, selected is black                                      | quiet and exact                                                  |
| Controls    | `V-K4` nav as circles in one pill, current filled ink                      | phone-and-desktop nav that floats on the picture                 |
| Functional  | `G-F1` physical picker: lens over a hairline ruler                         | a temperature or minutes picker feels like reading a thermometer |
| Functional  | `V-F1` instruments from marks: ticks per swim, stripes for progress        | the season goal as a counted ruler                               |
| Typography  | `V-T1` geometric sans, light display                                       | airy over a picture                                              |
| Typography  | `V-T2` large numbers light, never bold                                     | 11.4° at 200 px stays calm                                       |
| Transitions | `K-X1` smooth: picture melts into mist, no hard edge except the drawer     | reinforces `G-M3`                                                |

Counts: Cloud 8, Gallery 8, Verdant 6 of 22 (36% / 36% / 27%).

## Colour

Logic from Cloud (picture sets direction, UI neutral) with Gallery's grey type. Hue: sea-glass, OKLCH h 200, chroma at most 0.05. The picture is graded to the step it stands for.

| Step         | Hex     | Job                                                    | OKLCH             |
| ------------ | ------- | ------------------------------------------------------ | ----------------- |
| picture-cold | #96C0C5 | ground when the sea is cold (under 8°): deeper         | L .78 C .045      |
| picture-mid  | #BBDCDD | ground at 8 to 14°                                     | L .87 C .035      |
| mist         | #E6F3F4 | where the picture fades out; page bottom               | L .955 C .014     |
| white        | #FFFFFF | the one drawer sheet                                   | L 1               |
| ink          | #131C20 | numbers, titles, selected pill, the one primary button | L .22 C .015      |
| grey         | #6A7376 | secondary text, units, decimals                        | L .55 C .012      |
| hairline     | #BCC6C8 | chart lines, ruler ticks on mist                       | L .82 C .012      |
| delta-cold   | #1C6589 | small delta text: colder than last week                | L .48 C .09 h 235 |
| delta-warm   | #1B7A66 | small delta text: warmer                               | L .52 C .09 h 175 |

Nothing in the UI takes the picture's colour; buttons stay ink, white or glass.

## Imagery

- Role: forms the design (the ground). User photos are content and never replace the ground.
- Type: abstract open water, no subject, no people, no horizon clutter; graded pastel and cool by PIL.
- User photos: dissolve into mist at the bottom, caption on the fade in ink; a loud photo keeps its colour only at the top.
- Queries: `calm sea aerial`, `ocean wave`, `sea water texture blue` (ground); `swimming ocean woman`, `sunset beach sea`, `underwater sunlight` (user-like photos); `rocky cove sea` (spots).

## Signature components

1. **Sounding line**: a vertical hairline ruler 0 to 20°, ticks every degree, a lens at 11.4° with the number in an ink pill, ground depth beside it.
2. **Verdict**: one light word, "Go", at 120 px on the picture; wind, wave, tide, sunset as four quiet numbers with a hairline each.
3. **Season ticks**: 100 ticks, done ticks tall in ink, the coldest swim marked, count in light numerals.
4. **Log drawer**: the white sheet rising over the picture with handle; lens ruler for temperature, five feel pills, one fog-edged photo, one black "Save swim" pill.

## The design book must

- Open on the picture: one 11.4° at display size on the ground, and three strips of the same sea at 4°, 11° and 19° showing depth follow the number.
- Have no plates except the one white drawer sheet; every section stands on the picture or the mist.
- Show every user photo dissolving into mist, next to the raw photo with a hard edge for contrast.
- Melt into mist at the bottom; no hard edge except the drawer.
