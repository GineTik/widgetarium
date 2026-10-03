```widgetarium
v: 2
tiles:
  - id: head
    widget: "@catalogue/head"
    props:
      getSaid:
        implementation: "@catalogue/said"
        fields: {}
      getView:
        implementation: "@core/typed-value"
        fields:
          value: catalogue
  - id: views
    widget: "@catalogue/view-switch"
    props:
      getViews:
        implementation: "@core/from-tile-rows"
        fields:
          ref: shelf/holds
      getView:
        implementation: "@core/from-tile-value"
        fields:
          ref: shelf/selection
  - id: search
    widget: "@catalogue/search"
    props:
      getPlaceholder:
        implementation: "@core/typed-value"
        fields:
          value: Search widgets and templates
  - id: bar
    widget: "@catalogue/filter-bar"
    props:
      getView:
        implementation: "@core/from-tile-value"
        fields:
          ref: shelf/selection
      getHiddenInView:
        implementation: "@core/typed-value"
        fields:
          value: Templates
      getShown:
        implementation: "@catalogue/count"
        fields:
          which: shown
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
      getNarrowed:
        implementation: "@catalogue/count"
        fields:
          which: narrowed
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
      clearFilters:
        implementation: "@catalogue/clear-filters"
        fields:
          targets:
            - show/getSelection
            - packs/getSelection
            - tags/getSelection
  - id: sheethead
    widget: "@catalogue/sheet-head"
    props:
      getNarrowed:
        implementation: "@catalogue/count"
        fields:
          which: narrowed
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
      clearFilters:
        implementation: "@catalogue/clear-filters"
        fields:
          targets:
            - show/getSelection
            - packs/getSelection
            - tags/getSelection
  - id: show
    widget: "@catalogue/facet-list"
    props:
      getHeading:
        implementation: "@core/typed-value"
        fields:
          value: Show
      getRows:
        implementation: "@catalogue/showing"
        fields:
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
  - id: packs
    widget: "@catalogue/facet-list"
    props:
      getHeading:
        implementation: "@core/typed-value"
        fields:
          value: Packs
      getRows:
        implementation: "@catalogue/packs"
        fields:
          keyword: packs/getFilter
      getFilterPlaceholder:
        implementation: "@core/typed-value"
        fields:
          value: Filter packs
  - id: tags
    widget: "@catalogue/chip-group"
    props:
      getHeading:
        implementation: "@core/typed-value"
        fields:
          value: Tags
      getChips:
        implementation: "@catalogue/tags"
        fields:
          keyword: tags/getFilter
      getFilterPlaceholder:
        implementation: "@core/typed-value"
        fields:
          value: Filter tags
  - id: done
    widget: "@catalogue/sheet-done"
    props:
      getShown:
        implementation: "@catalogue/count"
        fields:
          which: shown
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
      close:
        implementation: "@core/value-set"
        fields:
          target: bar/getIsOpen
  - id: widgets
    widget: "@catalogue/widget-list"
    props:
      getEntries:
        implementation: "@catalogue/entries"
        fields:
          keyword: search/getValue
          showing: show/getSelection
          pack: packs/getSelection
          tag: tags/getSelection
      getSaid:
        implementation: "@catalogue/said"
        fields: {}
  - id: templates
    widget: "@catalogue/template-list"
    props:
      getTemplates:
        implementation: "@catalogue/templates"
        fields:
          keyword: search/getValue
layout:
  dir: row
  of:
    - dir: column
      keep: true
      of:
        - id: head
        - dir: row
          of:
            - id: views
              ratio: 3
            - id: search
              ratio: 4
            - id: bar
              ratio: 2
        - dir: swap
          id: shelf
          strip: false
          of:
            - dir: column
              name: Widgets
              of:
                - dir: column
                  collapse:
                    into: sheet
                    toggle: always
                    docks: false
                  trigger: bar/getIsOpen
                  name: Filters
                  of:
                    - id: sheethead
                    - id: show
                    - id: packs
                    - id: tags
                    - id: done
                - id: widgets
            - dir: column
              name: Templates
              of:
                - id: templates
```
