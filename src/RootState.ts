import _ from "lodash";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec } from "./prop";
import { callListeners, StateBaseInterface } from "./StateBase";
import { StateObject, stateObjectMixin } from "./StateObject";
import { StateReferenceNotNull } from "./StateReference";
import { revive, revive2, reviveReferences } from "./unwrap_revive";
import { ignoreNotifications } from "./ignoreNotifications";

export class RootStateImpl<T> extends stateObjectMixin<{}>() {

  _history = new NoboHistory(this);
  _isRootState = true;
  constructor(obj: any, options?: {}) {
    super(obj);
  }

  _checkReferencesNotNull(skipLog = false) : boolean {
    // console.log("_checkReferencesNotNull ");
    let valid = true;
    this._traverse((node) => {
      const ref = (node as  any as StateReferenceNotNull<any>);
      // console.log("check ", ref._path());
      if (ref._isStateReferenceNotNull)
      {
        valid &&= (ref as any)._ref !== null;
        if (!skipLog && (ref as any)._ref === null)
          console.error("Error: reference", ref._path(), "should not be null");
      }
    });
    return valid;
  }

  _ignoreNotifications(fn : () => void) {
    try {
      ignoreNotifications.current = true;
      fn();
    } finally {
      ignoreNotifications.current = false;
    }
  }
  _load(data: any) {
    try {
      ignoreNotifications.current = true;
      this._transaction(() => {
        this._history.ignore(() => {

          for (let k in data._stateObject)
          {
            if (!k.startsWith("_"))
             revive2(data._stateObject[k], this, k);
          }
          
          reviveReferences(this, data);
          
        });
      });
      if (!this._checkReferencesNotNull()) {
        throw new Error("Error, found at least one non null reference in the model");
      }
    }
    finally { ignoreNotifications.current = false; }
  }

  _inTransaction: boolean = false;
  _transactionCompleteListeners = new Map<
    StateBaseInterface<any> | ((...args: any[]) => void)[], // key: listener or listener array.
    { object: any, args: any[] }[] // value: object triggering the listener(s) and arguments.
  >();

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
          clone.forEach(callInfo => {
            // if one of the ancestor object has been removed, do not call the listener.
            let it = callInfo.object
            let isRemoved = it.__removed__ || it.__beingRemoved__;
            while (it && !isRemoved) {
              isRemoved ||= it.__removed__ || it.__beingRemoved__;
              it = it._parent;
            }

            if (!isRemoved)
              callListeners(listener, ...callInfo.args);
          });
          if (argsArray.length === 0)
            this._transactionCompleteListeners.delete(listener);
        });
      }

    });

    this._inTransaction = false;
  }
  _transaction<R>(transactionBody: () => R): R {
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

  _notification(object: any, listeners: StateBaseInterface<any> | ((...args: any[]) => void)[], ...args: any[]) {
    if (!this._inTransaction) {

      // Do not record actions performed by listeners in history as
      // they must be undone by listeners.
      if (this._history)
        this._history.ignore(() => {
          callListeners(listeners, ...args);
        });
      else
        callListeners(listeners, ...args);
    }
    else {
      let callInfo = this._transactionCompleteListeners.get(listeners);
      if (!callInfo) {
        callInfo = [];
        this._transactionCompleteListeners.set(listeners, callInfo);
      }
      if (!callInfo)
        throw new Error();
      // Only push args if it does not already exists.
      // console.log(args);
      // console.log(argsArray);

      // too slow!
      // if (-1 === callInfo.findIndex(elt => _.isEqual(elt.args, args)))
        callInfo.push({ object, args });
    }

  }
}

export type RootState<T> = StateObject<T> & RootStateImpl<T>;

export function makeRootState<T>(state: T, propId: PropSpec, options?: { log: boolean }): RootState<T> {

  let wrapped = new RootStateImpl(state, options);

  propagatePropIds(wrapped, propId);

  return wrapped as any as RootState<T>;
}

