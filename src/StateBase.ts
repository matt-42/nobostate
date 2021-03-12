import _ from "lodash";
import { autorunIgnore } from "./autorun";
import { NoboHistory } from "./history";
import { PropSpec, StatePropIdentifiers } from "./prop";
import { RootState } from "./RootState";
// import { updateState } from "./updateState";

export function callListeners(
  listeners: StateBaseInterface<any> | ((...args: any[]) => void)[],
  ...args: any[]) {

  return autorunIgnore(() => {

    if (!Array.isArray(listeners)) {
      listeners._parentListener?.();
      return;
    }
    else {
      // console.log("CALL LISTENERS START");
      // We clone the listeners because we don't want to
      // call the listeners that may be added by the present listeners.
      [...listeners].forEach(l => {
        // Check if l is still in the original listeners array.
        // because it may have been removed by other listerners.
        if (listeners.includes(l) && true)
          l(...args);
      });
      // console.log("CALL LISTENERS END");
    }
  });
}

export type ObjectPropsKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type KeyAccessType<T, P> =
  T extends (infer O)[] ? O :
  T extends Array<infer O> ? O :
  T extends Map<any, infer O> ? O :
  P extends keyof T ? T[P] : never;

type KeyAccessTypeNullable<T, P> =
  T extends (infer O)[] ? O | null :
  T extends Array<infer O> ? O | null :
  T extends Map<any, infer O> ? O | null :
  P extends keyof T ? T[P] : never;

export type Keys<T> =
  T extends Map<infer I, any> ? I :
  T extends Array<any> ? number :
  T extends any[] ? number :
  keyof T;

// usage : StateObject<T> extends stateBaseMixin(T)
export type Constructor<T = {}> = new (...args: any[]) => T;
export function stateBaseMixin<T, Ctor extends Constructor>(wrapped: Ctor) {


  type ThisKeyAccessType<P> = KeyAccessType<T, P>;
  type ThisKeys = Keys<T>;
  type ThisKeyAccessTypeNullable<P> = KeyAccessTypeNullable<T, P>;

  return class StateBaseClass extends wrapped {

    _isStateBase = true;

    __removed__ = false;

    _proxifiedThis: this | null = null;

    constructor(...args: any[]) {
      super(...args);
    }

    _parent: any | null = null;
    _props: StatePropIdentifiers<T> = null as any;

    _subscribers: {
      [K: string]: ((value: any, key: ThisKeys) => void)[];
    } = {};
    _thisSubscribers: ((value: this, key: ThisKeys) => void)[] = [];
    _parentListener: (() => void) | null = null;

    _onChange(listener: ((value: this, key: ThisKeys) => void)) {
      this._thisSubscribers.push(listener);
      return () => {
        const nRemoved = _.remove(this._thisSubscribers, l => l === listener).length;
        if (nRemoved !== 1)
          throw new Error(`nRemoved ${nRemoved} should be 1`);
      }
    }

    _removeListeners: ((o: T) => void)[] = [];
    _onRemove(listener: (o: T) => void) {
      const ignoredListener = (o: T) => this._getRootState()._history.ignore(() => listener(o));
      this._removeListeners.push(ignoredListener);
      return () => _.remove(this._removeListeners, l => l === ignoredListener);
    }
    _onRemoveInternal(listener: (o: T) => void) {
      this._removeListeners.push(listener);
      return () => _.remove(this._removeListeners, l => l === listener);
    }
    _beforeRemoveListeners: ((o: T) => void)[] = [];
    _onBeforeRemove(listener: (o: T) => void): () => void {
      const ignoredListener = (o: T) => this._getRootState()._history.ignore(() => listener(o));
      this._beforeRemoveListeners.push(ignoredListener);
      return () => _.remove(this._beforeRemoveListeners, l => l === ignoredListener);
    }

    _setProps(props: PropSpec) {
      this._props = props as any;
    }

    _getRootState(): RootState<unknown> {
      let it = this;
      while (it._parent)
        it = it._parent;
      if (!it)
        throw new Error();
      // if (!(it as any)._history)
      // throw new Error('Root state has no _history field.');
      return it as any as RootState<unknown>;
    }

    _rootStateAccess(path: string[]) {
      let elt: any = this._getRootState();
      for (let key of path)
        elt = elt._get(key);
      if (!elt)
        throw new Error(`rootStateAccess error: cannot access ${path.join('.')}`);
      return elt;
    }

    _logger() {
      return this._getRootState()?._loggerObject;
    }

    _subscribeSelector<R>(selector: (t: this) => R, compute: (selected: R) => void, initCall = false): void {
      let prev: R | null = null;
      this._subscribe(() => {
        let selected = selector(this);
        if (!_.isEqual(prev, selected)) {
          prev = selected;
          compute(selected);
        }
      }, initCall);
    }

    _subscribe(listener: (value: this, updatedKey: ThisKeys) => void, initCall = false): () => void {
      if (typeof listener !== 'function')
        throw new Error("Type error: listener is not a function.");
      this._thisSubscribers.push(listener);
      if (initCall)
        listener(this, null as any);
      return () => {
        if (_.remove(this._thisSubscribers, s => s === listener).length !== 1) {
          // throw new Error();
        }
      }
    }

    _subscribeKey<K extends ThisKeys>(
      key: K,
      listener: (value: ThisKeyAccessType<K>, updatedKey: ThisKeys) => void,
      initCall = false
    ): () => void {
      this._subscribers[key as string] ||= [];
      let subs = this._subscribers[key as string] as ((value: ThisKeyAccessType<K>, key: ThisKeys) => void)[];
      subs.push(listener);
      if (initCall && (this as any)[key] !== undefined)
        listener((this as any)[key], key);
      return () => {
        if (_.remove(subs, s => s === listener).length !== 1) {
          // throw new Error();
        }
      };
    }

    _path() {
      let it = this;
      if (!this._parent) return '';
      else {
        let parentPath = this._parent._path();
        if ((this._parent as any)._isStateTable)
          return parentPath + '[' + (this as any).id + ']';
        else return parentPath + '/' + _.last(this._props._path);
      }
    }

    _subscribeKeys(
      keys: ThisKeys[],
      listener: (value: this, updatedKey: ThisKeys) => void,
      initCall = false
    ): () => void {
      let disposers = keys.map(k => this._subscribeKey(k, (v: any, updatedKey: ThisKeys) => listener(this, updatedKey), initCall));
      return () => disposers.forEach(f => f());
    }

    _get<P extends ThisKeys>(prop: P): ThisKeyAccessType<P> { return (this as any)[prop]; }
    // _set<P extends ThisKeys>(prop: P, value: ThisKeyAccessType<P>) {
    //   updateState(this, prop, value);
    // }

    _runNotification(listeners: this | ((...args: any[]) => void)[],
      ...args: any[]) {

      if (!(this as any).__beingRemoved__ && !(this as any).__removed__) {
        let root = this._getRootState();
        if (root._notification)
          root._notification(this, listeners as any, ...args);
        else
          callListeners(listeners as any, ...args);
      }
    }

    // A prop has been updated.
    // notify subscribers and the parent.
    _notifySubscribers<P extends ThisKeys>(propOrId: P, value: ThisKeyAccessType<P>) {

      this._subscribers[propOrId as string] ||= [];
      this._runNotification(this._subscribers[propOrId as string], this._get(propOrId), propOrId);
      this._runNotification(this._thisSubscribers, this, propOrId);

      // [...this._subscribers[propOrId as string] || []].forEach(sub => this._runNotification(sub, this._get(propOrId), propOrId));
      // [...this._thisSubscribers].forEach(sub => this._runNotification(sub, this, propOrId));
      this._runNotification(this); // runs this.parentListener. 

    }
    _notifyThisSubscribers() {
      // [...this._thisSubscribers].forEach(sub => this._runNotification(sub, this, null as any));
      this._runNotification(this._thisSubscribers, this, null as any);
      this._runNotification(this); // runs this.parentListener. 
    }

    _parentDispose = null as null | (() => void);
    _children: StateBaseClass[] = [];
    _registerChild<P extends ThisKeys>(propOrId: P, child: ThisKeyAccessType<P>) {
      // console.log("1- push child for ");

      if ((child as any)._isStateBase) {
        let childBase = child as StateBaseClass;
        // when a child prop change.
        // we notify childs subscriber and the parent.
        childBase._parent = this._proxifiedThis || this;
        childBase._parentListener = () => {
          this._notifySubscribers(propOrId, child);
        };

        childBase._parentDispose?.();

        // Propagate the __removed__ flag to children.
        const disposeOnRemove = this._onRemove(() => {
          (childBase as any).__removed__ = true;
          [...childBase._removeListeners].forEach((f: any) => f(childBase));
        })
        // Add the child the the children array.
        this._children.push(child as StateBaseClass);
        // console.log("push child for ", propOrId);
        childBase._parentDispose = () => {
          _.remove(this._children, c => c === child);
          disposeOnRemove();
        }

      }
    }

    _traverse(fun: (node: StateBaseClass) => void): void {
      for (let child of this._children) {
        // if (k !== "_parent" && this[k] && (this[k] as any)._isStateBase && !(this[k] as any)._isStateReference)
        // {
        //   fun(this[k] as any);
        //   (this[k] as any as StateBaseClass)._traverse(fun);
        // }
        fun(child as any);
        (child as any as StateBaseClass)._traverse(fun);
        // }
      }
    }

  }
}


export interface StateBaseInterface<T> {
  _isStateBase: boolean;

  __removed__: boolean;

  _parent: any | null;
  // _props: StatePropIdentifiers<T> = null as any;
  _props: StatePropIdentifiers<T>;

  _subscribers: {
    [K: string]: ((value: any, key: Keys<T>) => void)[];
  };
  _thisSubscribers: ((value: any, key: Keys<T>) => void)[];
  _parentListener: (() => void) | null;

  _onChange(listener: ((value: this, key: Keys<T>) => void)): (() => void);

  _removeListeners: ((o: T) => void)[];
  _onRemove(listener: (o: T) => void): () => void;
  _onRemoveInternal(listener: (o: T) => void): () => void;

  _onBeforeRemove(listener: (o: T) => void): () => void;

  _path(): string;
  _setProps(props: PropSpec): void;
  _getRootState(): { _history: NoboHistory; };

  _rootStateAccess(path: string[]): any;

  _subscribeSelector<R>(selector: (t: this) => R, compute: (selected: R) => void, initCall?: boolean): void;

  _subscribe(listener: (value: this, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;

  _subscribeKey<K extends Keys<T>>(
    key: K,
    listener: (value: KeyAccessType<T, K>, updatedKey: Keys<T>) => void,
    initCall?: boolean
  ): () => void;

  _subscribeKeys(
    keys: Keys<T>[],
    listener: (value: this, updatedKey: Keys<T>) => void,
    initCall?: boolean
  ): () => void;


  _get<P extends Keys<T>>(prop: P): KeyAccessType<T, P>;
  // _set<P extends Keys<T>>(prop: P, value: KeyAccessType<T, P>): void;

  // A prop has been updated.
  // notify subscribers and the parent.
  _notifySubscribers<P extends Keys<T>>(propOrId: P, value: KeyAccessType<T, P>): void;

  _children: StateBaseInterface<any>[];
  _registerChild<P extends Keys<T>>(propOrId: P, child: KeyAccessType<T, P>): void;

  _traverse(fun: (node: StateBaseInterface<any>) => void): void;
}
