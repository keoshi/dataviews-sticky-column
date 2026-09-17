import { useEffect, useRef, useState } from 'react';

/**
 * The table in a frame that is a real viewport, not a box of a stated width.
 *
 * A `<div>` 390px wide is not a phone. The table inside it can be measured with
 * a container query, so the pinning behaves correctly — but everything in
 * DataViews that asks the *window* how much room there is carries on answering
 * with the width of the browser this demo happens to be open in. Two of those
 * matter here:
 *
 * - `ItemActions` drops its primary row actions through
 *   `useViewportMatch( 'medium', '<' )` and leaves only the ellipsis menu. In a
 *   `<div>` that never fires, so a 390px box showed a full actions column no
 *   phone would ever show.
 * - DataViews' own stylesheet sizes the selection checkboxes at 24px below a
 *   600px viewport and 16px above it — which changes the width of the very
 *   column the frozen title has to be offset by.
 *
 * An iframe has its own window, so both are answered by the browser rather than
 * simulated. The frame is genuinely 390px wide to everything inside it.
 *
 * The settings travel by `postMessage` rather than through the `src`, because
 * changing the `src` reloads the document — and the gesture this whole demo
 * exists for is *scroll the table sideways, then flip the switch*. A reload
 * there would throw away the scroll position at the exact moment it is the
 * thing being looked at.
 */
const ORIGIN = window.location.origin;

export default function Frame({ width, sticky, mode, title }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(680);
  const [ready, setReady] = useState(false);

  // Fixed at mount: the document inside is loaded once and talked to after.
  const [src] = useState(
    () => `?embed=1&sticky=${sticky ? '1' : '0'}&mode=${encodeURIComponent(mode)}`
  );

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== ORIGIN) return;
      if (event.data?.type === 'sticky-demo:ready') setReady(true);
      // Sized to its content, so nothing inside is cut off and the page has no
      // scrollbar of its own inside a scrollbar.
      if (event.data?.type === 'sticky-demo:height') setHeight(event.data.height);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage({ type: 'sticky-demo:settings', sticky, mode }, ORIGIN);
  }, [ready, sticky, mode]);

  return (
    <iframe
      ref={ref}
      className="frame"
      title={title}
      src={src}
      style={{ inlineSize: width, blockSize: `${height}px` }}
    />
  );
}
