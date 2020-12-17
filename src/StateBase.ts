import _ from "lodash";
import { Key, useEffect, useState } from "react";
import { StateArray, StateArrayInterface, StateObjectArray } from "./StateArray";
import { NoboHistory } from "./history";
import { propagatePropIds, PropSpec, StatePropIdentifiers } from "./prop";
import { RootState } from "./RootState";
import { StateObject } from "./StateObject";
import { IdType, StateTable } from "./StateTable";
import { updateState } from "./updateState";



export function useNoboState(state: any, prop?: any) {

  const [, setRefreshToggle] = useState({});
  const [value, setValue] = useState(prop ? state._get(prop) : state);

  useEffect(() => {
    let listener = _.throttle(() => {
      setValue(prop ? state._get(prop) : state);
      setRefreshToggle({});
    }, 50);

    if (prop)
      return state._subscribe(prop, listener);

    else
      return state._subscribe(listener);

  }, []);
  return value;
}


// export type StateKeyType<T> =
//   T extends StateReference<any> ? "id" :
//   T extends StateTableImpl<any> ? string :
//   T extends StateObjectImpl<infer O> ? ObjectPropsKeys<O> :

//   // T extends StateArrayImpl<any> ? number : 
//   // T extends StateObjectArrayImpl<any> ? number :   
//   number;

// export type StateValueType<T, K extends StateKeyType<T>> =
//   T extends StateReference<any> ? "id" :
//   T extends StateTableImpl<any> ? string :
//   T extends StateObjectImpl<infer O> ? O[K] :

//   // T extends StateArrayImpl<any> ? number : 
//   // T extends StateObjectArrayImpl<any> ? number :   
//   number;

export type ObjectPropsKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];


type KeyAccessType<T, P> =
  T extends (infer O)[] ? O :
  T extends Array<infer O> ? O :
  T extends Map<any, infer O> ? O :
  P extends keyof T ? T[P] : never;

type Keys<T> =
  T extends Map<infer I, any> ? I :
  T extends Array<any> ? number :
  T extends any[] ? number :
  keyof T;

  // type UnwrapStateType<T> = 
  // T extends StateArray<infer O> ? O :
  // T extends StateObjectArray<infer O> ? O :
  // T extends StateTable<infer O> ? O :
  // T extends StateObject<infer O> ? O : never;


  // type KeyAccessType<T, P> =
  //   T extends StateArray<infer O> ? O :
  //   T extends StateObjectArray<infer O> ? O :
  //   T extends StateTable<infer O> ? O :
  //   P extends keyof T ? T[P] : never;

  // type Keys<T> =
  // T extends StateTable<infer O> ? IdType<O> :
  // T extends StateArray<infer O> ? number :
  // T extends StateObjectArray<infer O> ? number :
  // keyof T;

// usage : StateObject<T> extends stateBaseMixin(T)
export type Constructor<T = {}> = new (...args: any[]) => T;
export function stateBaseMixin<T, Ctor extends Constructor>(wrapped: Ctor) {

  // type ConstructorType<C> = C extends new (...args: any[]) => infer O ? O : never;
  // type T = ConstructorType<Ctor>;

    // type Wrapped =
  //   T extends StateArray<infer O> ? O :
  //   T extends StateObjectArray<infer O> ? O :
  //   T extends StateTable<infer O> ? O :
  //   T extends StateObject<infer O> ? O : never;

  type ThisKeyAccessType<P> = KeyAccessType<T, P>;
  type ThisKeys = Keys<T>;


  // type ThisKeyAccessType<P> =
  //   T extends StateArray<infer O> ? O :
  //   T extends StateObjectArray<infer O> ? O :
  //   T extends StateTable<infer O> ? O :
  //   P extends keyof Wrapped ? Wrapped[P] : never;

  // type Keys =

  // T extends StateTable<infer O> ? IdType<O> :
  // T extends StateArray<infer O> ? O :
  // T extends StateObjectArray<infer O> ? O :
  // keyof Wrapped;

  //   T extends Map<infer I, any> ? I :
  //   // T extends Map<string, any> ? string :
  //   // T extends Map<any, any> ? string :
  //   T extends Array<any> ? number :
  //   T extends any[] ? number :
  //   keyof T;


  return class StateBaseClass extends wrapped {

    _isStateBase = true;

    constructor(...args: any[]) {
      super(...args);
    }

    _parent: any | null = null;
    // _props: StatePropIdentifiers<T> = null as any;
    _props: StatePropIdentifiers<T> = null as any;

    _subscribers: {
      [K: string]: ((value: any, key: ThisKeys) => void)[];
    } = {};
    _thisSubscribers: ((value: this, key: ThisKeys) => void)[] = [];
    _parentListener: (() => void) | null = null;

    _onChange(listener: ((value: this, key: ThisKeys) => void)) {
      this._thisSubscribers.push(listener);
      return () => {
        if (_.remove(this._thisSubscribers, l => l === listener).length !== 1)
          throw new Error();
      }
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

    _subscribeSelector<R>(selector: (t: this) => R, compute: (selected: R) => void): void {
      let prev: R | null = null;
      this._subscribe(() => {
        let selected = selector(this);
        if (!_.isEqual(prev, selected))
          compute(selected);
      })
    }

    _subscribe(listener: (value: this, updatedKey: ThisKeys) => void): () => void;
    _subscribe<K extends ThisKeys>(propOrId: K, listener: (value: ThisKeyAccessType<K>, updatedKey: ThisKeys) => void): () => void;
    _subscribe(arg1: any, arg2?: any): () => void {
      if (arg2 === undefined) {
        let listener = arg1 as ((value: this, key: ThisKeys) => void);
        this._thisSubscribers.push(listener);
        return () => _.remove(this._thisSubscribers, s => s === listener);
      }
      else {
        let propOrId = arg1 as ThisKeys;
        let listener = arg2 as () => void;
        this._subscribers[propOrId as string] ||= [];
        let subs = this._subscribers[propOrId as string] as ((value: this, key: ThisKeys) => void)[];
        subs?.push(listener);
        return () => { if (subs) _.remove(subs, s => s === listener); };
      }
    }

    _get<P extends ThisKeys>(prop: P): ThisKeyAccessType<P> { return (this as any)[prop]; }
    _set<P extends ThisKeys>(prop: P, value: ThisKeyAccessType<P>) {
      updateState(this, prop, value);
    }

    // A prop has been updated.
    // notify subscribers and the parent.
    _notifySubscribers<P extends ThisKeys>(propOrId: P, value: ThisKeyAccessType<P>) {
      [...this._subscribers[propOrId as string] || []].forEach(sub => sub(this._get(propOrId), propOrId));
      [...this._thisSubscribers].forEach(sub => sub(this, propOrId));
      this._parentListener?.();
    }
    _notifyThisSubscribers<P extends ThisKeys>() {
      this._parentListener?.();
      [...this._thisSubscribers].forEach(sub => sub(this, null as any));
    }

    _registerChild<P extends ThisKeys>(propOrId: P, child: ThisKeyAccessType<P>) {
      if ((child as any)._isStateBase) {
        let childBase = child as StateBaseClass;
        // when a child prop change.
        // we notify childs subscriber and the parent.
        childBase._parent = this;
        childBase._parentListener = () => {
          this._notifySubscribers(propOrId, child);
        };
      }
    }

    _use(): this;
    _use<K extends ThisKeys>(prop: K): ThisKeyAccessType<K>;
    _use(prop?: any): any { return useNoboState(this, prop); }

    /**
     * Refresh everytime selector return a different value.
     * Deep comparison (_.isEqual) is used to compare values.
     */
    _useSelector<R>(selector: (o: this) => R) {
      const [, setRefreshToggle] = useState({});
      const [value, setValue] = useState(selector(this));
      useEffect(() => {
        let prev: any = null;
        return this._subscribe(_.throttle(() => {
          let next = selector(this);
          if (!_.isEqual(prev, next)) {
            prev = next;
            setValue(selector(this));
            setRefreshToggle({});
          }

        }, 50, { trailing: true }));
      }, []);
      return value;
    }
  }
}


export interface StateBaseInterface<T> {
  _isStateBase: boolean;

  _parent: any | null;
  // _props: StatePropIdentifiers<T> = null as any;
  _props: StatePropIdentifiers<T>;

  _subscribers: {
    [K: string]: ((value: any, key: Keys<T>) => void)[];
  };
  _thisSubscribers: ((value: any, key: Keys<T>) => void)[];
  _parentListener: (() => void) | null;

  _onChange(listener: ((value: this, key: Keys<T>) => void)): (() => void);

  _setProps(props: PropSpec): void;
  _getRootState(): { _history: NoboHistory; };

  _rootStateAccess(path: string[]): any;

  _subscribeSelector<R>(selector: (t: this) => R, compute: (selected: R) => void): void;

  _subscribe(listener: (value: this, updatedKey: Keys<T>) => void): () => void;
  _subscribe<K extends Keys<T>>(propOrId: K, listener: (value: KeyAccessType<T, K>, updatedKey: Keys<T>) => void): () => void;


  _get<P extends Keys<T>>(prop: P): KeyAccessType<T, P>;
  _set<P extends Keys<T>>(prop: P, value: KeyAccessType<T, P>): void;

  // A prop has been updated.
  // notify subscribers and the parent.
  _notifySubscribers<P extends Keys<T>>(propOrId: P, value: KeyAccessType<T, P>): void;

  _registerChild<P extends Keys<T>>(propOrId: P, child: KeyAccessType<T, P>): void;

  _use(): this;
  _use<K extends Keys<T>>(prop: K): KeyAccessType<T, K>;

  /**
   * Refresh everytime selector return a different value.
   * Deep comparison (_.isEqual) is used to compare values.
   */
  _useSelector<R>(selector: (o: this) => R): R;
}
