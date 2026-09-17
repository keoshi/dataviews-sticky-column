import { useEffect, useState } from 'react';
import { RadioControl, ToggleControl } from '@wordpress/components';
import { pencil, seen, trash } from '@wordpress/icons';
import Frame from './Frame.jsx';
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
 * Each frame is its own viewport — see `Frame.jsx` — so the 390px one is a
 * 390px phone to everything inside it, including the parts of DataViews that
 * ask the window rather than the table. Nothing here is simulated but the room.
 *
 * 782px is wp-admin's own breakpoint, where the admin menu collapses. Which is
 * also why the pinning measures the table and not the window: a table is
 * *wider* in a 780px window than in an 800px one, and a media query would
 * unstick the wider of the two.
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

const PARAMS = new URLSearchParams(window.location.search);
const ORIGIN = window.location.origin;

/**
 * Two pages in one document: the demo, and the table on its own.
 *
 * The table page is what each frame loads. It is the same component with the
 * same data — the only difference is that it has a window of its own, which is
 * the whole point of loading it that way.
 */
export default function App() {
  return PARAMS.get('embed') ? <EmbeddedTable /> : <Demo />;
}

/** The table alone, driven by its parent through `postMessage`. */
function EmbeddedTable() {
  const [sticky, setSticky] = useState(PARAMS.get('sticky') !== '0');
  const [mode, setMode] = useState(PARAMS.get('mode') ?? 'actions');
  const [selection, setSelection] = useState([]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== ORIGIN || event.data?.type !== 'sticky-demo:settings') return;
      setSticky(event.data.sticky);
      setMode(event.data.mode);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'sticky-demo:ready' }, ORIGIN);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The frame is sized to this document, so the page holding it never puts a
  // scrollbar inside a scrollbar.
  useEffect(() => {
    const report = () =>
      window.parent.postMessage(
        { type: 'sticky-demo:height', height: document.documentElement.scrollHeight },
        ORIGIN
      );
    const observer = new ResizeObserver(report);
    observer.observe(document.body);
    report();
    return () => observer.disconnect();
  }, []);

  const bulk = mode === 'bulk';

  return (
    <PostsTable
      rows={DATA}
      columns={COLUMNS}
      sticky={sticky}
      actions={mode === 'none' ? undefined : bulk ? BULK_ACTIONS : ACTIONS}
      {...(bulk ? { selection, onChangeSelection: setSelection } : {})}
    />
  );
}

function Demo() {
  const [sticky, setSticky] = useState(true);
  const [width, setWidth] = useState('782');
  const [mode, setMode] = useState('actions');

  const frame = WIDTHS.find((option) => option.value === width) ?? WIDTHS[0];

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

      <Frame title="Posts table" width={frame.width} sticky={sticky} mode={mode} />
    </main>
  );
}
