```widgetarium
v: 2
tiles:
  - id: head
    widget: "@catalogue/head"
    props:
      getSaid:
        implementation: "@catalogue/docs-said"
        fields: {}
      getView:
        implementation: "@core/typed-value"
        fields:
          value: docs
  - id: search
    widget: "@catalogue/search"
    props:
      getPlaceholder:
        implementation: "@core/typed-value"
        fields:
          value: Search the docs
  - id: pages
    widget: "@catalogue/facet-list"
    props:
      getHeading:
        implementation: "@core/typed-value"
        fields:
          value: Pages
      getRows:
        implementation: "@catalogue/doc-pages"
        fields:
          keyword: search/getValue
  - id: page
    widget: "@catalogue/doc-page"
    props:
      getPage:
        implementation: "@catalogue/doc-page"
        fields:
          picked: pages/getSelection
      openPage:
        implementation: "@core/value-set"
        fields:
          target: pages/getSelection
layout:
  dir: row
  of:
    - dir: column
      keep: true
      of:
        - id: head
        - id: search
        - id: pages
        - id: page
```
