# Sticky first column in DataViews

A demo for a proposal: let a DataViews table pin its **first** column the way it
already pins its actions column.

DataViews holds the actions column against the right edge while the rest of the
table scrolls under it. The other end has no such option, and that is where the
loss is larger — scrolled right in a wide table, the column that goes is the one
saying which row you are on, and a screen of values belonging to nobody is not a
table.

**A table option, not a new default.** The actions column is sticky for everyone
whether they asked or not, which is right for a control that costs the same room
whatever the table holds. A column of *content* is different: how much room it
is worth depends on the data, so the table that knows says so.

## Run it

```bash
npm install
npm run dev
```

## What is in here

| File | What it is |
|---|---|
| `src/App.jsx` | The page: the posts table, and the switches for sticky, selection and width |
| `src/PostsTable.jsx` | The table on DataViews, and the hook standing in for the Core change |
| `src/styles/sticky-column.css` | The pinning — the actions-column block mirrored to the other edge |
| `src/data/posts.js` | Fourteen invented posts and ten columns after the title |

## What it stands in for

Nothing outside DataViews can put a class on a `td` DataViews renders, so the
pinning here is done with selectors under a class on a wrapper. The CSS is
written so that the Core version is a rename rather than a rewrite:

```
the primary cell   ->  .dataviews-view-table__primary-column--sticky
scrolled off zero  ->  .dataviews-view-table__primary-column--stuck
```

`useScrollState` already computes what the `--stuck` half needs on the same
scroll event, so it gains a line — `scrollLeft` away from the start rather than
at the end. `Math.abs` rather than `> 0` because RTL scrolls negative from zero,
which is the same reason `isScrolledToEnd` already special-cases it.

Two cases the demo answers rather than describes:

- **Bulk actions.** The checkbox column takes the first position and the title
  moves to second, so the pair is pinned together and the title is offset by the
  checkbox column's measured width. Pinning the checkboxes alone would be worse
  than pinning nothing.
- **Narrow tables.** Below 480px of *table* width — a container query, not a
  media query — the first column stops being sticky and the table scrolls whole.
  The actions column keeps its edge at every width, because what it reserves is
  a control rather than content.

The row actions do nothing and the posts are invented. Built on
`@wordpress/dataviews` 19.0.0.
