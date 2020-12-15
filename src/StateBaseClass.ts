import _ from "lodash";
import { useEffect, useState } from "react";
import { NoboHistory } from "./history";
import { propagatePropIds, StatePropIdentifiers } from "./prop";
import { RootState } from "./RootState";
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
//   T extends StateForeignKey<any> ? "id" :
//   T extends StateTableImpl<any> ? string :
//   T extends StateObjectImpl<infer O> ? ObjectPropsKeys<O> :

//   // T extends StateArrayImpl<any> ? number : 
//   // T extends StateObjectArrayImpl<any> ? number :   
//   number;

// export type StateValueType<T, K extends StateKeyType<T>> =
//   T extends StateForeignKey<any> ? "id" :
//   T extends StateTableImpl<any> ? string :
//   T extends StateObjectImpl<infer O> ? O[K] :

//   // T extends StateArrayImpl<any> ? number : 
//   // T extends StateObjectArrayImpl<any> ? number :   
//   number;

export type ObjectPropsKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];


// usage : StateObject<T> extends stateBaseMixin(T)
export type Constructor<T = {}> = new (...args: any[]) => T;
export function stateBaseMixin<T, Ctor extends Constructor>(wrapped: Ctor) {

  // type ConstructorType<C> = C extends new (...args: any[]) => infer O ? O : never;
  // type T = ConstructorType<Ctor>;

  type KeyAccessType<P> =
    T extends (infer O)[] ? O :
    T extends Array<infer O> ? O :
    T extends Map<any, infer O> ? O :
    P extends keyof T ? T[P] : never;

  type Keys =
    T extends Map<infer I, any> ? I :
    // T extends Map<string, any> ? string :
    // T extends Map<any, any> ? string :
    T extends Array<any> ? number :
    T extends any[] ? number :
    keyof T;


  return class StateBaseClass extends wrapped {

    _isStateBase = true;

    constructor(...args: any[]) {
      super(...args);
    }

    _parent: any | null = null;
    // _props: StatePropIdentifiers<T> = null as any;
    _props: StatePropIdentifiers<T> = null as any;

    _subscribers: {
      [K: string]: ((value: any, key: Keys) => void)[];
    } = {};
    _thisSubscribers: ((value: this, key: Keys) => void)[] = [];
    _parentListener: (() => void) | null = null;

    _getRootState() : RootState<any> {
      let it = this;
      while (it._parent)
        it = it._parent;
      return it as any as RootState<any>;
    }

    _rootStateAccess(path: string[]) {
      let elt: any = this._getRootState();
      for (let key of path)
        elt = elt._get(key);
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

    _subscribe(listener: (value: this, updatedKey: Keys) => void): () => void;
    _subscribe<K extends Keys>(propOrId: K, listener: (value: KeyAccessType<K>, updatedKey: Keys) => void): () => void;
    _subscribe(arg1: any, arg2?: any): () => void {
      if (arg2 === undefined) {
        let listener = arg1 as ((value: this, key: Keys) => void);
        this._thisSubscribers.push(listener);
        return () => _.remove(this._thisSubscribers, s => s === listener);
      }
      else {
        let propOrId = arg1 as Keys;
        let listener = arg2 as () => void;
        this._subscribers[propOrId as string] ||= [];
        let subs = this._subscribers[propOrId as string] as ((value: this, key: Keys) => void)[];
        subs?.push(listener);
        return () => { if (subs) _.remove(subs, s => s === listener); };
      }
    }

    _get<P extends Keys>(prop: P): KeyAccessType<P> { return (this as any)[prop]; }
    _set<P extends Keys>(prop: P, value: KeyAccessType<P>) {
      updateState(this, prop, value);
    }

    // A prop has been updated.
    // notify subscribers and the parent.
    _notifySubscribers<P extends Keys>(propOrId: P, value: KeyAccessType<P>) {
      this._subscribers[propOrId as string]?.forEach(sub => sub(this._get(propOrId), propOrId));
      this._thisSubscribers.forEach(sub => sub(this, propOrId));
      this._parentListener?.();
    }
    _notifyThisSubscribers<P extends Keys>() {
      this._parentListener?.();
      this._thisSubscribers.forEach(sub => sub(this, null as any));
    }

    _registerChild<P extends Keys>(propOrId: P, child: KeyAccessType<P>) {
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
    _use<K extends Keys>(prop: K): KeyAccessType<K>;
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

export interface StateBaseInterface<T> {

  _parent: any | null;
  // _props: StatePropIdentifiers<T> = null as any;
  _props: StatePropIdentifiers<T>;

  _subscribers: {
    [K : string]: ((value: any, key: Keys<T>) => void)[];
  };
  _thisSubscribers: ((value: any, key: Keys<T>) => void)[];
  _parentListener: (() => void) | null;

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
