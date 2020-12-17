import _ from "lodash";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec } from "./prop";
import { anyStateObject, createProxy, StateObject, stateObjectMixin } from "./StateObject";
import { revive, reviveReferences } from "./unwrap_revive";
import { updateState } from "./updateState";


export class RootStateImpl<T> extends stateObjectMixin<{}>() {
  
  _history = new NoboHistory();

  _load(data: any) {
    let loadedState = reviveReferences(revive(data));
    for (let k in loadedState)
      if (!k.startsWith("_"))
        updateState(this, k, loadedState[k]);
  }

}

export type RootState<T> = StateObject<T> & RootStateImpl<T>;

export function makeRootState<T>(state: T, propId: PropSpec): RootState<T> {

  let wrapped = createProxy(new RootStateImpl(state));

  // wrapped._update(state);
  // for (let k in state)
  //   (wrapped as any)[k] = state[k];
  // wrapped._update(new RootStateImpl() as any);

  propagatePropIds(wrapped, propId);


  return wrapped as any as RootState<T>;
  // return createProxy<RootState<T>>(root as any);
}

