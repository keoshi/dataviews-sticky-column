import { useState } from 'react';
import { RadioControl, ToggleControl } from '@wordpress/components';
import { pencil, seen, trash } from '@wordpress/icons';
import PostsTable from './PostsTable.jsx';
import { AUTHORS, CATEGORIES, STATUSES, rows } from './data/posts.js';

/**
 * Sticky first column in DataViews — the proposal, on a table anybody can read.
 *
 * DataViews already pins one column: the actions column holds the right edge
 * while the rest of the table scrolls under it. This proposes the same
 * treatment for the other end, where the stakes are higher. Scrolled right in a
 * wide table, what a reader loses is the one column that says which row they
 * are on, and a screen of values belonging to nobody is not a table.
 *
 * **An option, not a new default.** The actions column is sticky for everyone
 * whether they asked or not, which is the right call for a control that costs
 * the same room whatever is in the table. A column of content is different: how
 * much room it is worth depends on the data, so the table that knows says so.
 * This page has it on because that is the case being made; the switch turns it
 * off to see what today reads like.
 */

const asElements = (values) => values.map((value) => ({ value, label: value }));

/**
 * Ten columns after the title. Not an exaggeration for effect — a posts list
 * with an SEO plugin, an analytics plugin and a custom taxonomy or two gets
 * there on an ordinary site.
 *
 * Author, status and categories declare the values they take, which is what
 * turns a column into a filter. DataViews owns that control, so filtering here
 * looks the way it looks everywhere else.
 */
const COLUMNS = [
  { id: 'author', label: 'Author', elements: asElements(AUTHORS) },
  { id: 'status', label: 'Status', elements: asElements(STATUSES) },
  { id: 'category', label: 'Categories', elements: asElements(CATEGORIES) },
  { id: 'tags', label: 'Tags' },
  { id: 'comments', label: 'Comments' },
  { id: 'views', label: 'Views' },
  { id: 'words', label: 'Words' },
  { id: 'readTime', label: 'Reading time' },
  { id: 'published', label: 'Published' },
  { id: 'modified', label: 'Last modified' },
];

/**
 * Stand-ins. Nothing here does anything — they exist because the right-hand
 * sticky column has to be on screen for the left-hand one to be compared
 * against it, and because checkboxes only appear once an action says it can run
 * over a set.
 */
const ACTIONS = [
  { id: 'edit', label: 'Edit', icon: pencil, isPrimary: true, callback: () => {} },
  { id: 'view', label: 'View', icon: seen, callback: () => {} },
  { id: 'trash', label: 'Trash', icon: trash, isDestructive: true, callback: () => {} },
];

/*
 * The same actions, saying they can run over a set — which is the only thing
 * that makes DataViews draw the checkbox column. Viewing is the one that cannot:
 * a bulk action opens nothing, and "View" over eleven rows has no meaning.
 */
const BULK_ACTIONS = ACTIONS.map((action) =>
  action.id === 'view' ? action : { ...action, supportsBulk: true }
);

/**
 * Four amounts of room, as a frame rather than a browser you have to resize.
 *
 * The behaviour is written as a container query, so a table in a 390px box
 * behaves the way it would on a 390px phone — same component, same stylesheet,
 * different amount of room.
 *
 * 782px is wp-admin's own breakpoint, where the admin menu collapses. Which is
 * also why the query measures the table and not the window: a table is *wider*
 * in a 780px window than in an 800px one, and a media query would unstick the
 * wider of the two.
 *
 * One thing these frames cannot reproduce. Below a 782px *viewport* DataViews
 * hides the primary row actions and leaves only the ellipsis menu — that is
 * `useViewportMatch( 'medium', '<' )`, which reads the window rather than the
 * table. So the 390px frame here still shows a full actions column, where a
 * real phone would not. Narrow the browser to see it.
 */
const WIDTHS = [
  { value: 'full', label: 'Full width', width: '100%' },
  { value: '782', label: '782px — where the admin menu collapses', width: '782px' },
  { value: '600', label: '600px — a narrow panel', width: '600px' },
  { value: '390', label: '390px — a phone, upright', width: '390px' },
];

/*
 * One control rather than two, because DataViews ties them: the checkbox column
 * appears when an action says it can run over a set, so there is no such thing
 * as checkboxes without actions.
 */
const SELECTION = [
  { value: 'none', label: 'Neither' },
  { value: 'actions', label: 'Row actions' },
  { value: 'bulk', label: 'Row actions and checkboxes' },
];

const DATA = rows();

export default function App() {
  const [sticky, setSticky] = useState(true);
  const [width, setWidth] = useState('782');
  const [mode, setMode] = useState('actions');
  const [selection, setSelection] = useState([]);

  const frame = WIDTHS.find((option) => option.value === width) ?? WIDTHS[0];
  const bulk = mode === 'bulk';

  return (
    <main className="page">
      <header className="page-header">
        <h1>Sticky first column in DataViews</h1>
      </header>

      <div className="panel controls">
        <ToggleControl
          __nextHasNoMarginBottom
          label="Sticky first column"
          checked={sticky}
          onChange={setSticky}
        />
        <RadioControl
          label="Selection and actions"
          selected={mode}
          options={SELECTION}
          onChange={setMode}
        />
        <RadioControl
          label="Table width"
          selected={width}
          options={WIDTHS.map(({ value, label }) => ({ value, label }))}
          onChange={setWidth}
        />
      </div>

      <div className="frame" style={{ inlineSize: frame.width }}>
        <PostsTable
          rows={DATA}
          columns={COLUMNS}
          sticky={sticky}
          actions={mode === 'none' ? undefined : bulk ? BULK_ACTIONS : ACTIONS}
          {...(bulk ? { selection, onChangeSelection: setSelection } : {})}
        />
      </div>
    </main>
  );
}
