import _ from "lodash";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec } from "./prop";
import { createStateObjectProxy, StateObject, stateObjectMixin } from "./StateObject";
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
        let loadedState = revive(data);

        for (let k in loadedState)
          if (!k.startsWith("_"))
            updateState(this, k, loadedState[k]);

        reviveReferences(this, data);
        
      });
    });
  }

  _inTransaction: boolean = false;
  _transactionCompleteListeners = new Map<(...args: any[]) => void, any[][]>();

  _beginTransaction() {
    this._inTransaction = true;
  }
  _commitTransaction() {
    // Do not record state update of listeners in history.
    this._history.ignore(() => {

      while (this._transactionCompleteListeners.size) {
        this._transactionCompleteListeners.forEach((argsArray, listener) => {
          const clone = [...argsArray];
          argsArray.length = 0;
          clone.forEach(args => listener(...args));
          if (argsArray.length === 0)
            this._transactionCompleteListeners.delete(listener);
        });
      }

    });

    this._inTransaction = false;
  }
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

  propagatePropIds(wrapped, propId);

  return wrapped as any as RootState<T>;
}

