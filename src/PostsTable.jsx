import { useEffect, useMemo, useRef, useState } from 'react';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';

/**
 * A DataViews table with its first column pinned — the proposal, standing in
 * for the patch.
 *
 * DataViews already pins one column. The actions column holds the right edge
 * while the rest of the table scrolls under it, and a 1px divider appears on
 * its leading edge only while there is content underneath. Two classes carry
 * that — `dataviews-view-table__actions-column--sticky` for the pinning and
 * `--stuck` for the divider — and the second is driven from `useScrollState`,
 * which listens on the layout container and reports `isHorizontalScrollEnd`.
 *
 * The first column wants the same treatment for a better reason. What a reader
 * loses when a wide table scrolls is the one column that says which row they
 * are on, and a screen of values belonging to nobody is not a table. The
 * actions column pinned to the right keeps a control reachable; the primary
 * column pinned to the left keeps the data legible.
 *
 * **What Core would change.** `useScrollState` already computes what is needed
 * on the same scroll event, so the hook gains a line — `scrollLeft` away from
 * the start rather than at the end:
 *
 *     setIsHorizontallyScrolled( Math.abs( scrollContainer.scrollLeft ) > 1 );
 *
 * and the table's primary cell takes the mirror of the classes the actions cell
 * already has: `dataviews-view-table__primary-column--sticky` while the option
 * is on, and `--stuck` while `isHorizontallyScrolled`. The stylesheet is the
 * existing actions-column block with `right` swapped for `left` and the divider
 * moved to the other edge. `Math.abs` rather than `> 0` because RTL scrolls
 * negative from zero — the same reason `isScrolledToEnd` already special-cases
 * it.
 *
 * **What this stands in for.** Nothing outside DataViews can put a class on a
 * `td` it renders, so the pinning is done with selectors under a class on our
 * own wrapper, and this hook supplies the `--stuck` half by watching the same
 * container Core's hook watches. The CSS is written so that the Core version is
 * a rename rather than a rewrite — see `styles/sticky-column.css`.
 */
export default function PostsTable({ rows, columns, actions, sticky, selection, onChangeSelection }) {
  const frame = useRef(null);

  // Whether DataViews will draw a checkbox column, worked out on its own terms:
  // one action that says it can run over a set is enough, whether or not the
  // selection is controlled from outside. The sticky column needs to know,
  // because with checkboxes on it is the second cell of a pair rather than the
  // first cell of the table.
  const hasBulkActions = (actions ?? []).some((action) => action.supportsBulk);

  const { stuck, lead } = useStickyColumn(frame, sticky, hasBulkActions);

  const fields = useMemo(
    () => [
      {
        id: 'title',
        label: 'Title',
        enableHiding: false,
        enableSorting: true,
        getValue: ({ item }) => item.title,
        render: ({ item }) => <span className="post-title">{item.title}</span>,
      },
      ...columns.map((column) => ({
        id: column.id,
        label: column.label,
        enableSorting: true,
        // A column that declares the values it takes is a column DataViews can
        // filter on, with its own control rather than one this page invented.
        ...(column.elements
          ? { elements: column.elements, filterBy: { operators: ['isAny'] } }
          : {}),
        // Cells carry a display string and the value underneath it, so "12,480"
        // sorts as a number rather than as text beginning with a one.
        getValue: ({ item }) => item[column.id]?.sort ?? item[column.id]?.value ?? item[column.id] ?? '',
        render: ({ item }) => {
          const cell = item[column.id];
          return <>{cell && typeof cell === 'object' ? cell.value : cell}</>;
        },
      })),
    ],
    [columns]
  );

  const [view, setView] = useState({
    type: 'table',
    perPage: 20,
    page: 1,
    search: '',
    filters: [],
    fields: columns.map((column) => column.id),
    titleField: 'title',
  });

  const { data, paginationInfo } = useMemo(
    () => filterSortAndPaginate(rows, view, fields),
    [rows, view, fields]
  );

  return (
    <div
      ref={frame}
      className={`posts-table${sticky ? ' has-sticky-column' : ''}${stuck ? ' is-stuck' : ''}`}
      // How far in the primary column has to start when a checkbox column is
      // sitting in front of it. Measured rather than assumed: that width is
      // DataViews' own and moves with density.
      style={lead ? { '--sticky-lead': `${lead}px` } : undefined}
    >
      <DataViews
        data={data}
        fields={fields}
        view={view}
        onChangeView={setView}
        paginationInfo={paginationInfo}
        getItemId={(item) => item.id}
        defaultLayouts={{ table: {} }}
        actions={actions ?? []}
        search={false}
        {...(onChangeSelection ? { selection, onChangeSelection } : {})}
      />
    </div>
  );
}

/**
 * The `--stuck` half of the proposal, and the offset the checkbox case needs.
 *
 * **With bulk actions it is a pair, not a column.** The checkbox column takes
 * the first position and the primary field the second, so both have to be
 * sticky and the second has to start where the first one ends. Pinning the
 * checkboxes alone would be worse than pinning nothing — a column of empty
 * boxes held against the edge while the names they belong to scroll away
 * underneath. So this measures the checkbox column and publishes its width as
 * `--sticky-lead`, and the stylesheet offsets the primary cell by it.
 */
function useStickyColumn(frame, enabled, hasBulkActions) {
  const [stuck, setStuck] = useState(false);
  const [lead, setLead] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStuck(false);
      setLead(0);
      return undefined;
    }

    // The element DataViews scrolls, and the one its own hook is given. Queried
    // rather than held as a ref because it belongs to the component: child DOM
    // is in place by the time a parent effect runs, so this resolves on mount.
    const container = frame.current?.querySelector('.dataviews-layout__container');
    if (!container) return undefined;

    const measure = () => {
      setStuck(Math.abs(container.scrollLeft) > 1);
      // The header cell rather than a body one: a table can be empty and still
      // has to hold its offset. `getBoundingClientRect` rather than
      // `offsetWidth`, which rounds — half a pixel here is a hairline of the
      // scrolling columns showing through beside the checkboxes.
      const checkbox = frame.current?.querySelector('th.dataviews-view-table__checkbox-column');
      setLead(checkbox ? checkbox.getBoundingClientRect().width : 0);
    };

    measure();
    container.addEventListener('scroll', measure, { passive: true });
    // A column count or a window change can take the table from scrolling to
    // not, which retires the divider without anybody scrolling.
    window.addEventListener('resize', measure);

    return () => {
      container.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
    // `hasBulkActions` is in the list because the checkbox column arriving or
    // leaving changes the offset without changing anything this effect listens
    // to.
  }, [frame, enabled, hasBulkActions]);

  return { stuck, lead };
}
