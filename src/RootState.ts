import _ from "lodash";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec } from "./prop";
import { anyStateObject, createStateObjectProxy, StateObject, stateObjectMixin } from "./StateObject";
import { revive, reviveReferences } from "./unwrap_revive";
import { updateState } from "./updateState";


export class Logger {

  groupEnd() {
    console.groupEnd();
  }

  log(message: any) {
    console.log(message);
  }

  groupLog(message: any) {
    console.group(message);
  }
}
export class RootStateImpl<T> extends stateObjectMixin<{}>() {

  _history = new NoboHistory(this);
  _loggerObject: Logger | null = null;

  constructor(obj: any, options?: { log: boolean }) {
    super(obj);
    if (options?.log)
      this._loggerObject = new Logger();
  }

  _load(data: any) {
    this._transaction(() => {
      this._history.ignore(() => {
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

      });
    });
  }

  _inTransaction: boolean = false;
  _transactionCompleteListeners = new Map<(...args: any[]) => void, any[][]>();

  _beginTransaction() {
    this._inTransaction = true;
    // console.log("Start transaction");
  }
  _commitTransaction() {
    // console.log("END transaction start");
    // Do not record state update or listeners in history.
    this._history.ignore(() => {

      while (this._transactionCompleteListeners.size) {
        // console.log("this._transactionCompleteListeners.size", this._transactionCompleteListeners.size);
        this._transactionCompleteListeners.forEach((argsArray, listener) => {
          const clone = [...argsArray];
          argsArray.length = 0;
          // console.log("pop _transactionCompleteListeners");
          clone.forEach(args => listener(...args));
          if (argsArray.length === 0)
            this._transactionCompleteListeners.delete(listener);
        });
      }

    });

    // this._transactionCompleteListeners.clear();
    // console.log("END transaction");
    this._inTransaction = false;
  }
  // _onTransactionComplete(key: any, listener: () => void) { 
  //   this._transactionCompleteListeners.set(key, listener);
  // }
  _transaction<R>(transactionBody: () => R) : R {
    if (this._inTransaction)
      return transactionBody();
    else {
      try {
        this._beginTransaction();
        return transactionBody();
      } finally {
        this._commitTransaction();
      }
    }
  }

  _notification(listener: (...args: any[]) => void, ...args: any[]) {
    if (!this._inTransaction)
      // Do not record actions performed by listeners in history as
      // they must be undone by listeners.
      this._history.ignore(() => {
        listener(...args);
      });
    else {
      let argsArray = this._transactionCompleteListeners.get(listener) as any[][];
      if (!argsArray) {
        argsArray = [];
        this._transactionCompleteListeners.set(listener, argsArray);
      }
      if (!argsArray)
        throw new Error();
      // Only push args if it does not already exists.
      // console.log(args);
      // console.log(argsArray);
      if (-1 === argsArray.findIndex(elt => _.isEqual(elt, args)))
        argsArray.push(args);
    }

  }
}

export type RootState<T> = StateObject<T> & RootStateImpl<T>;

export function makeRootState<T>(state: T, propId: PropSpec, options?: { log: boolean }): RootState<T> {

  let wrapped = createStateObjectProxy(new RootStateImpl(state, options));

  // wrapped._update(state);
  // for (let k in state)
  //   (wrapped as any)[k] = state[k];
  // wrapped._update(new RootStateImpl() as any);

  propagatePropIds(wrapped, propId);


  return wrapped as any as RootState<T>;
  // return createProxy<RootState<T>>(root as any);
}

