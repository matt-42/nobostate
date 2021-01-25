import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StateArray, StateObjectArray } from "./StateArray";
import { Keys, StateBaseInterface } from "./StateBase";
import { StateObject } from "./StateObject";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { HasId, IdType, StateTable } from "./StateTable";
import { unwrapState } from "./unwrap_revive";

export function useNoboState<T>(state: T): T {
  return useNoboStateImpl(state);
}

export function useNoboStateImpl(state: any, prop?: any) {

  const [, setRefreshToggle] = useState({});

  const getValue = () => {
    if (prop === "__ref__") return state;
    else if (prop) return state._get(prop)
    else return state;
  }

  const [value, setValue] = useState(getValue());

  useEffect(() => {
    let listener = _.throttle(() => {
      setRefreshToggle({});
      // setValue must be called after setRefreshToggle otherwise it misses refreshes in react-tree-fiber
      setValue(getValue());
    }, 16);

    if (prop === "__ref__")
      return state._subscribeRef(listener);
    else if (prop)
      return state._subscribeKey(prop, listener);

    else
      return state._subscribe(listener);

  }, []);
  return value;
}


// type StateTypes<T> = StateObject<T> | StateTable<T> | StateArray<T> | StateObjectArray<T> | StateReference<T> | StateReferenceNotNull<T> | StateReferenceArray<T>

type ExtractKeys<T> =
  T extends StateTable<infer B> ? IdType<B> :
  T extends StateObject<infer B> ? keyof B :
  T extends StateObjectArray<infer B> ? number :
  T extends StateArray<infer B> ? number :
  T extends StateReference<infer B> ? never :
  T extends StateReferenceNotNull<infer B> ? never :
  T extends StateReferenceArray<infer B> ? number :
  never;

type KeyAccessType2<T, K> =
  T extends StateTable<infer B> ? B :
  T extends StateObject<infer B> ? (K extends keyof B ? B[K] : never) :
  T extends StateObjectArray<infer B> ? number :
  T extends StateArray<infer B> ? number :
  T extends StateReference<infer B> ? never :
  T extends StateReferenceNotNull<infer B> ? never :
  T extends StateReferenceArray<infer B> ? number :
  never;

export function useNoboKey<T, K extends ExtractKeys<T>>(state_: T, key: K): KeyAccessType2<T, K> {
  const state = (state_ as any as StateBaseInterface<any>);
  if (!state._isStateBase) throw new Error("state_ argument must be a nobostate object");
  const [, setRefreshToggle] = useState(0);
  const getValue = useCallback(() => (state as any as StateBaseInterface<any>)._get(key), []);
  const [value, setValue] = useState(getValue());

  useEffect(() => {
    let i = 0;
    let listener = _.throttle(() => {
      setRefreshToggle(++i);
      // setValue must be called after setRefreshToggle otherwise it misses refreshes in react-tree-fiber
      setValue(getValue());
    }, 16);
    return state._subscribeKey(key, listener);

  }, [setRefreshToggle, setValue, key, getValue]);
  return value as any;
}

export function useNoboKeys<T, K extends Array<ExtractKeys<T>>>
  (state_: T, keys: K): { [Key in keyof K]: KeyAccessType2<T, Key> } {

  const state = (state_ as any as StateBaseInterface<any>);
  if (!state._isStateBase) throw new Error("state_ argument must be a nobostate object");

  const [, setRefreshToggle] = useState({});

  const getValue = () => {
    let res = {} as any;
    keys.forEach(k => res[k] = state._get(k));
    return res;
  }

  const [value, setValue] = useState(getValue());

  useEffect(() => {
    let listener = _.throttle(() => {
      setRefreshToggle({});
      // setValue must be called after setRefreshToggle otherwise it misses refreshes in react-tree-fiber
      setValue(getValue());
    }, 16);

    keys.forEach(k => state._subscribeKey(k, listener));

  }, []);
  return value;
}


/**
 * Refresh everytime selector return a different value.
 * Deep comparison (_.isEqual) is used to compare values.
 */
export function useNoboSelector<T, R>(state: StateObject<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateTable<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateArray<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateObjectArray<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateReference<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateReferenceArray<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateReferenceNotNull<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateReferenceArray<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: T, selector: (o: T) => R): R {
  const [, setRefreshToggle] = useState({});
  const [value, setValue] = useState(selector(state));
  const ctx = useMemo(() => { return { prev: null as any }; }, []);

  const getComparable = (x: any) => (x as any as StateBaseInterface<any>)?._isStateBase ? unwrapState(x) : x;
  useEffect(() => {
    return (state as any as StateBaseInterface<any>)._subscribe(_.throttle(
      () => {
        let next = selector(state);
        let nextComparable = getComparable(next);
        if (!_.isEqual(ctx.prev, nextComparable)) {
          ctx.prev = nextComparable;
          setRefreshToggle({});
          // setValue must be called after setRefreshToggle otherwise it misses refreshes in react-tree-fiber
          setValue(next);
        }

      }
      , 50, { trailing: true })
    );
  }, []);

  // Run the selector at every render to be sure we are in sync.
  let actualValue = selector(state);
  if (!_.isEqual(actualValue, value)) {
    setValue(actualValue);
    ctx.prev = actualValue;
    return actualValue;
  }

  return value;
  // if (actualValue)
}


export function useNoboRef<T extends HasId<any>>(state: StateReference<T>): StateReference<T>;
export function useNoboRef<T extends HasId<any>>(state: StateReferenceNotNull<T>): StateReferenceNotNull<T>;
export function useNoboRef<T extends HasId<any>>(state: any): any {
  return useNoboStateImpl(state, "__ref__");
}


export function useNoboRefKey<T extends HasId<any>>(state: StateReference<T>, key: Keys<T>): any {

  // if (!prop)
  //   console.log("_use", state);
  const [, setRefreshToggle] = useState({});

  const getValue = () => state.ref?._get(key) || null;

  const [value, setValue] = useState(getValue());

  useEffect(() => {
    let dispose: null | (() => void) = null;
    let listener = _.throttle(() => {
      // Ref changed.
      dispose?.();
      dispose = state.ref?._subscribeKey(key, () => {
        setRefreshToggle({});
        // setValue must be called after setRefreshToggle otherwise it misses refreshes in react-tree-fiber
        setValue(getValue());
      }, true) || null;
    }, 16);

    return state._subscribeRef(listener);

  }, []);
  return value;
}


export function useNoboMapSelector<T extends HasId<any>, R>(table: StateTable<T>, mapSelector: (o: StateObject<T>) => R) {
  return useNoboSelector(table, table => [...table.values()].map(mapSelector));
}

export function useNoboIds<T extends HasId<any>>(table: StateTable<T>) {
  const [ids, setIds] = useState<IdType<T>[]>([...table.keys()]);
  const update = () => setIds([...table.keys()]);

  useEffect(() => {
    let disposers = [table.onInsert(update), table.onKeyDelete(update)];
    return () => disposers.forEach(f => f());
  }, []);

  return ids;
  // This use to be simpler with useSelector but the selector is also run of every update
  // of every table object which is useless.
  // return this._useSelector(table => [...table.keys()]); 
}