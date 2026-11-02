// Local shim for t3code's `apps/web/src/rpc/atomRegistry.ts`, without the
// React provider, which pulls in @effect/atom-react.
import { type Atom, AtomRegistry } from "effect/reactivity";

export const appAtomRegistry = AtomRegistry.make();

/** Calls `listener` with each value after the current one. */
export function subscribeAtomChanges<A>(
  atom: Atom.Atom<A>,
  listener: (value: A) => void,
): () => void {
  let current = true;
  return appAtomRegistry.subscribe(
    atom,
    (value) => {
      if (current) {
        current = false;
        return;
      }
      listener(value);
    },
    { immediate: true },
  );
}
