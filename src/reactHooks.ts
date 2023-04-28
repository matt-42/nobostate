import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { autorun, Reaction } from "./autorun";
import { RootState } from "./RootState";
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

export function useMounted() {
  const mounted = useMemo(() => { return { current: true } }, []);
  useEffect(() => {
    return () => { mounted.current = false };
  }, [mounted]);
  return mounted;
}

export function useRefreshThisComponent() {
  let [, setVal] = useState(1);
  return useMemo(() => {
    let i = 2;
    return () => setVal(++i); }, []);
}

export function useNoboStateImpl(state: any, prop?: any) {

  const refresh = useRefreshThisComponent();

  const getValue = () => {
    if (prop === "__ref__") return state;
    else if (prop) return state._get(prop)
    else return state;
  }

  const [value, setValue] = useState(getValue());
  const mounted = useMounted();

  useEffect(() => {
    let listener = () => {
      if (mounted.current)
      {
        refresh();
        // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
        setValue(getValue());
      }
    };

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
  T extends RootState<infer B> ? keyof B :
  T extends StateObjectArray<infer B> ? number :
  T extends StateArray<infer B> ? number :
  T extends StateReference<infer B> ? never :
  T extends StateReferenceNotNull<infer B> ? never :
  T extends StateReferenceArray<infer B> ? number :
  never;

type KeyAccessType2<T, K> =
  T extends StateTable<infer B> ? B :
  T extends StateObject<infer B> ? (K extends keyof B ? B[K] : never) :
  T extends RootState<infer B> ? (K extends keyof B ? B[K] : never) :
  T extends StateObjectArray<infer B> ? number :
  T extends StateArray<infer B> ? number :
  T extends StateReference<infer B> ? never :
  T extends StateReferenceNotNull<infer B> ? never :
  T extends StateReferenceArray<infer B> ? number :
  never;

export function useNoboKey<T, K extends ExtractKeys<T>>(state_: T, key: K): KeyAccessType2<T, K> {
  const state = (state_ as any as StateBaseInterface<any>);
  if (!state._isStateBase) throw new Error("state_ argument must be a nobostate object");
  let refresh = useRefreshThisComponent();
  const getValue = useCallback(() => (state as any as StateBaseInterface<any>)._get(key), []);
  const [value, setValue] = useState(getValue());

  const mounted = useMounted();

  useEffect(() => {
    let i = 0;
    let listener = _.throttle(() => {
      if (mounted.current)
      {
        refresh();
        // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
        setValue(getValue());
      }
    }, 16);
    return state._subscribeKey(key, listener);

  }, [mounted, setValue, key, getValue]);
  return value as any;
}

export function useNoboKeys<T, K extends Array<ExtractKeys<T>>>
  (state_: T, keys: K): { [Key in keyof K]: KeyAccessType2<T, Key> } {

  const state = (state_ as any as StateBaseInterface<any>);
  if (!state._isStateBase) throw new Error("state_ argument must be a nobostate object");

  const refresh = useRefreshThisComponent();
  const getValue = () => {
    let res = {} as any;
    keys.forEach(k => res[k] = state._get(k));
    return res;
  }

  const [value, setValue] = useState(getValue());

  const mounted = useMounted();

  useEffect(() => {
    let listener = _.throttle(() => {
      if (mounted.current)
      {
        refresh();
        // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
        setValue(getValue());
      }
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
export function useNoboSelector<T extends HasId<any>, R>(state: StateReferenceArray<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: StateReferenceNotNull<T>, selector: (o: typeof state) => R): R;
export function useNoboSelector<T, R>(state: T, selector: (o: T) => R): R {
  const refresh = useRefreshThisComponent();
  const [value, setValue] = useState(selector(state));
  const ctx = useMemo(() => { return { prev: null as any }; }, []);

  const getComparable = (x: any) => (x as any as StateBaseInterface<any>)?._isStateBase ? unwrapState(x) : x;
  const mounted = useMounted();

  useEffect(() => {
    return (state as any as StateBaseInterface<any>)._subscribe(_.throttle(
      () => {
        if (mounted.current)
        {
          let next = selector(state);
          let nextComparable = getComparable(next);
          if (!_.isEqual(ctx.prev, nextComparable)) {
            ctx.prev = nextComparable;
            refresh();
            // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
            setValue(next);
          }
        }

      }
      , 50, { trailing: true })
    );
  }, [mounted]);

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
  const refresh = useRefreshThisComponent();

  const getValue = () => state.ref?._get(key) || null;

  const [value, setValue] = useState(getValue());

  const mounted = useMounted();

  useEffect(() => {
    let dispose: null | (() => void) = null;
    let listener = _.throttle(() => {
      // Ref changed.
      dispose?.();
      dispose = state.ref?._subscribeKey(key, () => {
        if (mounted.current)
        {          
          refresh();
          // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
          setValue(getValue());
        }
      }, true) || null;
    }, 16);

    return state._subscribeRef(listener);

  }, [mounted]);

  return value;
}


export function useNoboMapSelector<T extends HasId<any>, R>(table: StateTable<T>, mapSelector: (o: StateObject<T>) => R) {
  return useNoboSelector(table, table => [...table.values()].map(mapSelector));
}

export function useNoboIds<T extends HasId<any>>(table: StateTable<T>) {
  const [ids, setIds] = useState<IdType<T>[]>(table.ids());

  useEffect(() => {
    return table._subscribeIds(setIds);
  }, []);

  return ids;
  // This use to be simpler with useSelector but the selector is also run of every update
  // of every table object which is useless.
  // return this._useSelector(table => [...table.keys()]); 
}

export function useNoboObserver<R>(f : () => R) {

  const [state, setState] = useState<R>(null as any);

  useEffect(() => {
    return autorun(() => { return setState(f()); });
  }, []);

  return state;
}

export function observer<P>(component : React.FunctionComponent<P>, name ? : string) :  React.FunctionComponent<P> {
  let firstCall = true;
  return (props: P) => {

    const refresh = useRefreshThisComponent();
    const reaction = useMemo(() => new Reaction(() => {
      // console.log("Observer::refresh ", name);
      refresh(); 
    }), []);

    useEffect(() => () => reaction.dispose(), []);

    // console.log("Observer::render ", name, firstCall);

    firstCall = false;
    return reaction.track(() => component(props), name) || null;
  }
}

export function debouncedObserver<P>(component : React.FunctionComponent<P>, name ? : string, waitMs?: number) :  React.FunctionComponent<P> {
  let firstCall = true;
  return (props: P) => {

    const refresh = _.debounce(useRefreshThisComponent(), waitMs);
    const reaction = useMemo(() => new Reaction(() => {
      // console.log("Observer::refresh ", name);
      refresh(); 
    }), []);

    useEffect(() => () => reaction.dispose(), []);

    // console.log("Observer::render ", name, firstCall);

    firstCall = false;
    return reaction.track(() => component(props), name) || null;
  }
}