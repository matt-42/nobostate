import _ from "lodash";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec } from "./prop";
import { anyStateObject, createProxy, StateObject, stateObjectMixin } from "./StateObject";
import { revive, reviveReferences } from "./unwrap_revive";
import { updateState } from "./updateState";


export class RootStateImpl<T> extends stateObjectMixin<{}>() {

  _history = new NoboHistory();

  _load(data: any) {
    this._beginTransaction();
    // this.pauseSubscribers();
    let loadedState = revive(data);

    // for (let k in loadedState) {
    //   if ((k as string).startsWith("_")) continue;

    //   if (isPrimitive((this as any)[k])) {
    //     // console.log("update ", k, " with ", loadedState[k])
    //     (this as any)[k] = loadedState[k];
    //     this._notifySubscribers(k, (this as any)[k]);
    //   }

    //   else
    //     updateState(this, k, loadedState[k]);
    // }

    for (let k in loadedState)
      if (!k.startsWith("_"))
        updateState(this, k, loadedState[k]);

    reviveReferences(this, data);
    // this.resumeSubscribers();
    this._commitTransaction();
  }

  _inTransaction: boolean = false;
  _transactionCompleteListeners = new Map<any, () => void>();

  _beginTransaction() { this._inTransaction = true; }
  _commitTransaction() { 
    this._transactionCompleteListeners.forEach(l => l());
    this._transactionCompleteListeners.clear();
    this._inTransaction = false; 
  }
  _onTransactionComplete(key: any, listener: () => void) { 
    this._transactionCompleteListeners.set(key, listener);
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

