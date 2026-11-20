/**
 * Handlers for a number field that select what is in it when it takes focus, so a typed value
 * replaces the old one ("5", not "50"). The release of the click that focused the field would put
 * a caret back, so that one release is ignored.
 */

import type { FocusEvent, MouseEvent } from 'react';

const focused = new WeakSet<EventTarget>();

export const selectOnFocus = {
  onFocus(event: FocusEvent<HTMLInputElement>): void {
    event.currentTarget.select();
    focused.add(event.currentTarget);
  },
  onMouseUp(event: MouseEvent<HTMLInputElement>): void {
    if (focused.delete(event.currentTarget)) event.preventDefault();
  },
};
