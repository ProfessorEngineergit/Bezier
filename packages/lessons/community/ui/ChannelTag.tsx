/** A small tag marking beta features, or the server features of development builds. */

import type { Gate } from '../client/channel.js';

const MEANING: Record<Gate, string> = {
  beta: 'New, and still being proved. Part of the beta channel.',
  alpha: 'Reaches a server. Only in development builds, not in a published Bezier.',
};

export function ChannelTag({ gate }: { gate: Gate }) {
  return (
    <span className="beta-tag" data-gate={gate} title={MEANING[gate]}>
      {gate === 'alpha' ? 'Dev' : 'Beta'}
    </span>
  );
}
