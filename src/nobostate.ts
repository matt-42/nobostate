// names:
//   NoBoS
//   nestr
//   
/* eslint-disable */

import _ from "lodash";
import { useEffect, useState } from "react";
import { HistoryArrayAction, HistoryTableAction, HistoryUpdatePropAction, NoboHistory } from "./history";


// Candidate to replace redux.

// problems of redux:
//  lots of boilerplate code.
//  complex dispatch/thunk/getstate()...
//  performance: need to create a new array/maps everytime we update anything inside.
//  invalide states


// solution, use a mutable state with observable properties


// update the state.
// state.trajectories[id].name.set("newName");
// state.trajectories.insert({ ....});
// state.trajectories.remove(id);

// access the state.
// state.trajectories[id].name.get();

// react component re-render when something change in the state.
// let name = state.trajectories[id].name.use();


// undo: 
//   diff based: for each update, keep (prev, next) values.
//     -> we can ignore certains actions from the undo history.
//   how do we specify which action we ignore ?
//   group consecutive updates on the same property.
//   

// transactions?

// declare the state:

function useNoboState(state: any, prop?: any) {

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


export type Subscriber<T> = (value: T, key: StateKeyType<T>) => void
type SubscriberArray<T> = Subscriber<T>[];

type StateKeyType<T> =
  T extends StateTableImpl<any> ? string :
  T extends StateObjectImpl<infer O> ? ObjectPropsKeys<O> :
  // T extends StateArrayImpl<any> ? number : 
  // T extends StateObjectArrayImpl<any> ? number :   
  number;




type ObjectPropsKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];


type StateBaseExactType<T> =
  T extends StateTableImpl<infer O> ? StateTable<O> :
  T extends StateObject<infer O> ? StateObject<O> :
  T;

export class StateBaseClass<T> {
  _parent: any | null = null;
  _propId: PropId = null as any;

  _subscribers: { [K in StateKeyType<T>]?: SubscriberArray<T> } = {};
  _thisSubscribers: SubscriberArray<T> = [];
  _parentListener: (() => void) | null = null;

  _getRootState() {
    let it = this;
    while (it._parent)
      it = it._parent;
    return it as any as { _history: NoboHistory };
  }


  _subscribeImpl(arg1: any, arg2?: any): () => void {
    if (arg2 === undefined) {
      let listener = arg1 as Subscriber<T>;
      this._thisSubscribers.push(listener);
      return () => _.remove(this._thisSubscribers, s => s === listener)
    }
    else {
      let propOrId = arg1 as StateKeyType<T>;
      let listener = arg2 as () => void;
      this._subscribers[propOrId] ||= [];
      let subs = this._subscribers[propOrId] as SubscriberArray<T>;
      subs.push(listener);
      return () => { _.remove(subs, s => s === listener); }
    }
  }

  // A prop has been updated.
  // notify subscribers and the parent.
  _notifySubscribers(propOrId: StateKeyType<T>, value: any) {
    this._thisSubscribers.forEach(sub => sub(value, propOrId));
    this._subscribers[propOrId]?.forEach(sub => sub(value, propOrId));
    this._parentListener?.();
  }

  _registerChild(propOrId: any, child: any) {
    if (child._parentListener !== undefined) {
      // when a child prop change.
      // we notify childs subscriber and the parent.
      child._parent = this;
      child._parentListener = () => {
        this._notifySubscribers(propOrId, child);
      }
    }
  }

  /**
   * Refresh everytime selector return a different value.
   * Deep comparison (_.isEqual) is used to compare values.  
   */
  _useSelector<R>(selector: (o: StateBaseExactType<T>) => R) {
    const impl: StateBaseExactType<T> = this as any;
    const [, setRefreshToggle] = useState({});
    const [value, setValue] = useState(selector(impl));
    useEffect(() => {
      let prev: any = null;
      return this._subscribeImpl(_.throttle(() => {
        let next = selector(impl);
        if (!_.isEqual(prev, next)) {
          prev = next;
          setValue(selector(impl));
          setRefreshToggle({});
        }

      }, 50, { trailing: true }));
    }, []);
    return value;
  }
}
/**
 * Update prop \prop of state dst with value src.
 * @param dst 
 * @param prop 
 * @param src 
 */
function updateState(dst: any, prop: any, src: any) {

  // console.log('udate state! ', dst, src);
  const isPrimitive = (o: any) => !(o instanceof StateObjectImpl ||
    o instanceof StateArrayImpl ||
    o instanceof StateTableImpl);

  let toUpdate = dst[prop];
  if (toUpdate instanceof StateArrayImpl || toUpdate instanceof StateObjectArrayImpl) {
    let arrayToUpdate = toUpdate as any as StateArray<any>;
    // Resize dst array if too large.
    while (arrayToUpdate._wrapped.length > src.length)
      arrayToUpdate.pop();

    // Update existing elements of the array.
    for (let i = 0; i < arrayToUpdate.length; i++) {
      if (isPrimitive(arrayToUpdate[i])) {
        arrayToUpdate[i] = src[i];
        toUpdate._notifySubscribers(i, arrayToUpdate[i]);
      }
      else
        updateState(arrayToUpdate, i, src[i]);
    }
    // Insert new elements.
    for (let i = arrayToUpdate.length; i < src.length; i++) {
      arrayToUpdate.push(src[i]);
    }
    // Check that arrayToUpdate and src have the same size.    
    if (arrayToUpdate.length != src.length)
      throw new Error();
  }
  else if (toUpdate instanceof StateObjectImpl) {
    let obj = toUpdate as any;
    for (let k in src) {
      if (isPrimitive(obj[k])) {
        // console.log("update ", k, " with ", src[k])
        obj._wrapped[k] = src[k];
        obj._notifySubscribers(k, obj._wrapped[k]);
      }
      else
        updateState(obj, k, src[k]);
    }
  }
  else if (toUpdate instanceof StateTableImpl) {
    let newKeys = src._stateTable.map((e: any) => e.id);
    let idsToRemove = _.difference([...toUpdate.ids()], newKeys);
    for (let id of idsToRemove)
      toUpdate.remove(id);
    for (let elt of src._stateTable)
      if ((toUpdate as StateTable<any>)._wrapped.has(elt.id))
        updateState(toUpdate, elt.id, elt);
      else
        toUpdate.insert(elt);
    // throw new Error("not implemented");
  }
  else {
    if (dst._wrapped) {
      let prev = dst._wrapped[prop]

      dst._wrapped[prop] = src;
      dst._notifySubscribers(prop, src);

      // console.log(prop);
      // console.log(dst._getRootState());
      let history = dst._getRootState()._history;
      // console.log(history.push);
      history.push({
        action: "updateProp",
        target: dst,
        prop: prop,
        propId: dst._propId[prop],
        prev,
        next: src
      } as HistoryUpdatePropAction);
    }

  }
}

export class StateObjectArrayImpl<T> extends StateBaseClass<StateObjectArrayImpl<T>>  {

  _isObjectArray = true; // Just to differenciate with StateArrayImpl
  _wrapped = [] as T[];

  push(...elements: T[]) {
    elements.forEach(elt => {
      let o: StateObject<T> = elt instanceof StateBaseClass ? elt as any : stateObject(elt);

      // let o = stateObject<T>(elt, this._propId);
      propagatePropIds(o, this._propId);

      this._wrapped.push(o);
      this._registerChild(this._wrapped.length - 1, o);
      this._notifySubscribers(this._wrapped.length - 1, o);
      this._getRootState()._history.push({
        action: "push",
        propId: this._propId,
        target: this,
        element: o
      } as HistoryArrayAction)
    });

  }

  _get(i: number) {
    return this._wrapped[i as number];
  }

  _set(i: number, val: T) {
    if (this._wrapped.length <= i)
      throw new Error(`StateArray: access out of bound (index: ${i}, array size: ${this._wrapped.length})`);
    updateState(this, i, val);
  }

  _use(): StateObjectArray<T>
  _use(index: number): T
  _use(index?: any): any { return useNoboState(this, index); }

  _subscribe(listener: Subscriber<StateObjectArray<T>>): () => void
  _subscribe(propOrId: string, listener: Subscriber<T>): () => void
  _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }

}
export class StateArrayImpl<T> extends StateBaseClass<StateArrayImpl<T>>
{

  _wrapped = [] as T[];

  push(...elements: T[]) {
    elements.forEach(elt => {
      this._wrapped.push(elt);
      this._notifySubscribers(this._wrapped.length - 1, elt);
      this._getRootState()._history.push({
        action: "push",
        propId: this._propId,
        target: this,
        element: elt
      } as HistoryArrayAction)
    });

  }

  _get(i: number) {
    return this._wrapped[i as number];
  }

  _set(i: number, val: T) {
    if (this._wrapped.length <= i)
      throw new Error(`StateArray: access out of bound (index: ${i}, array size: ${this._wrapped.length})`);
    updateState(this, i, val);
  }

  _use(): StateArray<T>
  _use(index: number): T
  _use(index?: any): any { return useNoboState(this, index); }

  _subscribe(listener: Subscriber<StateArray<T>>): () => void
  _subscribe(propOrId: string, listener: Subscriber<T>): () => void
  _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }


}

export interface HasId<T> { id: T };
type IdType<T> = T extends HasId<infer I> ? I : T;
export class StateTableImpl<O extends HasId<any>> extends StateBaseClass<StateTableImpl<O>>{

  _wrapped = new Map<IdType<O>, StateObject<O>>();

  _use(): StateTable<O>
  _use(id: IdType<O>): O
  _use(id?: IdType<O>): any { return useNoboState(this, id); }

  _useIds() { return this._useSelector(table => [...table.keys()]); }

  _subscribe(listener: Subscriber<StateTable<O>>): () => void
  _subscribe(propOrId: string, listener: Subscriber<O>): () => void
  _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }

  ids() { return this._wrapped.keys(); }

  map<R>(f: (o: StateObject<O>) => R) { return [...this._wrapped.values()].map(f); }
  flatMap<R>(f: (o: StateObject<O>) => R) { return [...this._wrapped.values()].flatMap(f); }
  forEach(f: (o: StateObject<O>) => void) { return [...this._wrapped.values()].forEach(f); }

  insert(value: O) {
    let elt: StateObject<O> = value instanceof StateBaseClass ? value as any : stateObject(value);
    propagatePropIds(elt, this._propId);
    let id = (elt as any).id;
    this._registerChild(id, elt);
    this._wrapped.set(id, elt);
    this._notifySubscribers(id, elt);
    // console.log(this._getRootState());
    // console.log(this._getRootState()._history);
    this._getRootState()._history.push({
      action: "insert",
      propId: this._propId,
      target: this,
      element: elt
    } as HistoryTableAction)
  }

  assertGet(id: IdType<O>) {
    let res = this._wrapped.get(id);
    if (!res) throw new Error(`StateTable get error: id ${id.toString()} does not exists`);
    return res;
  }

  _get(id: IdType<O>) {
    return this.assertGet(id);
  }

  _set(id: IdType<O>, val: O) {
    if (this._wrapped.has(id))
      updateState(this, id, val);
    else
      this.insert(val);
  }

  remove(id: IdType<O>) {
    let elt = this._wrapped.get(id);
    this._wrapped.delete(id);
    this._notifySubscribers(id, null);
    this._getRootState()._history.push({
      action: "remove",
      propId: this._propId,
      target: this,
      element: elt
    } as HistoryTableAction)
  }
}

class RawTable<T extends HasId<any>> {
  _stateTable = [];
}

export function Table<T extends HasId<any>>(): RawTable<T> {
  return new RawTable();
}


class StateObjectImpl<T> extends StateBaseClass<StateObjectImpl<T>>{

  _wrapped: T;

  constructor(data: T) {
    super();

    this._wrapped = data;
    for (let k in this._wrapped)
      if (this._wrapped[k] instanceof StateBaseClass)
        this._registerChild(k, this._wrapped[k] as any);

  }

  _get(prop: ObjectPropsKeys<T>) { return this._wrapped[prop]; }
  _set(prop: ObjectPropsKeys<T>, value: any) {
    updateState(this, prop, value);
  }

  _update(value: { [K in keyof T]?: T[K] }) {
    for (let k in value)
      updateState(this, k, value[k]);
  }

  _use(): StateObject<T>
  _use<K extends keyof T>(prop: K): T[K]
  _use(prop?: any): any { return useNoboState(this, prop); }

  _subscribe(listener: Subscriber<StateObject<T>>): () => void
  _subscribe<K extends keyof T>(propOrId: K, listener: Subscriber<T[K]>): () => void
  _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }

};


function createProxy<T>(wrapped: any) {
  return new Proxy(wrapped, {
    get: (target, prop, receiver) => {
      if (target[prop] !== undefined)
        return target[prop];
      else {
        let value = target._wrapped[prop];
        if (typeof value === "function")
          return value.bind(target._wrapped);
        else
          return target._wrapped[prop];
      }
    },
    set: (target, prop, value, receiver) => {
      if (target[prop] !== undefined)
        target[prop] = value;
      else
        receiver._set(prop, value);
      return true
    },
  }) as T;
}

function stateFactory<T>(ctor: any, ...args: any[]) {
  return createProxy<T>(new ctor(...args));
}

type ReadOnly<T> =
  T extends Array<any> ? T :
  T extends Object ? {
    readonly [P in keyof T]: ReadOnly<T[P]>;
  } : T;

type ReadOnlyNonStateTypes<T> =
  T extends StateObject<infer O> ? StateObject<{ [P in keyof O]: ReadOnlyNonStateTypes<O[P]>; }> :
  T extends StateTable<infer O> ? StateTable<{ [P in keyof O]: ReadOnlyNonStateTypes<O[P]>; }> :
  T extends StateArray<infer O> ? StateArray<ReadOnlyNonStateTypes<O>> :
  T extends StateObjectArray<infer O> ? StateObjectArray<{ [P in keyof O]: ReadOnlyNonStateTypes<O[P]>; }> :
  ReadOnly<T>;


type RootState<T> = PublicStateType<ReadOnlyNonStateTypes<StateObject<T>>> & { _load: (data: any) => void, _history: NoboHistory };


function makeRootState<T>(state: T, propId: PropId, options: { undoIgnoreProps: PropId[] }) {

  let obj = {} as any;
  for (let k in state)
    (obj as any)[k] = state[k];
  let wrapped = new StateObjectImpl<T>(obj);

  propagatePropIds(wrapped, propId as PropId);

  let proxy = createProxy<RootState<T>>(_.assign(wrapped, {

    // Load plain data into the state.
    _load: (data: any) => {
      let loadedState = bindState(data);
      for (let k in loadedState)
        updateState(proxy, k, loadedState[k]);
    },

    // State action history.
    _history: new NoboHistory(options.undoIgnoreProps)

  }));

  return proxy;
}

export type StateArray<T> = Array<T> & StateArrayImpl<T>;
export type StateObjectArray<T> = Array<T> & StateObjectArrayImpl<T>;
export type StateTable<T extends HasId<any>> = Map<IdType<T>, T> & StateTableImpl<T>;
export type StateObject<T> = T & StateObjectImpl<T>;

type xxx = StateObject<number | null>;
// StateObject<T | null> = T & StateObjectImpl<T>;
// Factories.
export const stateArray = <T>() => stateFactory<StateArray<T>>(StateArrayImpl);
export const stateObjectArray = <T>() => stateFactory<StateObjectArray<T>>(StateObjectArrayImpl);
export const stateObject = <T>(data: T) => stateFactory<StateObject<T>>(StateObjectImpl, data);
export const stateTable = <T extends HasId<any>>() => stateFactory<StateTable<T>>(StateTableImpl);

export type PropId = { [key: string]: PropId } & { _propId: number };

type StatePropIdentifiers<T> =
  T extends null ? PropId :
  T extends string ? PropId :
  T extends number ? PropId :
  T extends StateObject<infer V> ? { [K in keyof V]: StatePropIdentifiers<V[K]> } :
  T extends StateArray<infer V> ? StatePropIdentifiers<V> :
  T extends StateObjectArray<infer V> ? StatePropIdentifiers<V> :
  T extends StateTable<infer V> ? StatePropIdentifiers<V> :
  PropId;

function createPropIds<T>(): StatePropIdentifiers<T> {
  let cpt = 0;
  return new Proxy({ _path: "", _propId: cpt++ } as any, {
    get: (target, prop, receiver) => {
      let sprop = prop as string;
      if (target[sprop])
        return target[sprop];
      else {
        target[sprop] = { _propId: cpt++, _path: target._path + (prop as string) };
        return target[sprop];
      }
    }
  }) as any as StatePropIdentifiers<T>;
}


function propagatePropIds<T>(state: T, propId: PropId): void {

  if (state instanceof StateBaseClass)
    state._propId = propId;

  if (state instanceof StateTableImpl) {
    for (let obj of (state as any as StateTable<any>).values())
      propagatePropIds(obj, propId);
  }
  else if (state instanceof StateObjectImpl) {
    for (let k in state._wrapped)
      propagatePropIds(state._wrapped[k], propId[k]);
  }
  else if (state instanceof StateArrayImpl || state instanceof StateObjectArrayImpl) {
    for (let k of state as any as StateArray<any>)
      propagatePropIds(k, propId);
  }

}

/**
 * From a plain javascript object, create a state object.
 * To create table:
 *   - { _stateTable: [...] }
 *   - new StateTable<T>()
 * To create an object: { _stateObject: props... }
 * @param state 
 * @param propId 
 * @param ignoreProps 
 */
function bindState(state: any): any {

  // Do not re-bind already bound objects.
  if (state._registerChild) return state;

  // map.
  else if (state._stateTable) {
    let table = stateTable();
    state._stateTable.forEach((elt: any) => table.insert(elt));
    return table as any;
  }
  // Array
  else if (state._stateArray) {
    let arr = stateArray();
    arr.push(...state);
    return arr as any;
  }
  // Object Array.
  else if (state._stateObjectArray) {
    let arr = stateObjectArray();
    arr.push(...state);
    return arr as any;
  }
  // Object
  else if (state._stateObject) {
    let obj = {};
    for (let k in state)
      (obj as any)[k] = bindState(state[k]);
    return stateObject(obj) as any;
  }
  // prop
  else
    return state;
}

function initializePropIdentifiers(propId: any, state: any) {
  state.propId = propId;
  for (let k in state)
    if (typeof state[k] !== 'function')
      initializePropIdentifiers(propId[k], state[k]);
}

/**
 * Extract state for serialization. 
 * @param state 
 */
type UnwrapedType<T> =
  T extends StateTable<infer O> ? { _stateTable: UnwrapedType<O>[] } :
  T extends StateObject<infer O> ? { _stateObject: UnwrapedType<O> } :
  T extends StateArray<infer O> ? { _stateArray: UnwrapedType<O>[] } :
  T;

type StateAny = RootState<any> | StateArrayImpl<any> | StateObjectArrayImpl<any> | StateTableImpl<any> | StateObjectImpl<any>;

export function unwrapState<T>(state: T): UnwrapedType<T>;
export function unwrapState<T extends StateAny>(state: T): any {
  if (state instanceof StateTableImpl) { // Table
    return { _stateTable: [...state._wrapped.values()].map(v => unwrapState(v)) };
  }
  else if ((state as StateObjectImpl<any>)._wrapped) { // StateObject
    let obj = {} as any;
    let src = ((state as any)._wrapped as any);
    for (let k in src)
      if (typeof src[k] !== 'function' && !k.startsWith("_"))
        obj[k] = unwrapState(src[k]);
    return { _stateObject: obj };
  }
  else if (state instanceof StateArrayImpl) { // Array
    let stateArray = state as any as StateArray<any>;
    let arr = [];
    for (let i = 0; i < stateArray.length; i++)
      arr.push(unwrapState(stateArray[i]));
    return { _stateArray: arr };
  }
  return state;
}


type FilterInternalMethods<T> =
  T extends "_registerChild" | "_propsId" | "_notifySubscribers" |
  "_subscribers" | "_parentListener" | "_wrapped" |
  "_get" | "_propId" | "_parent" ?
  never : T;

type RemoveInternalMethods<T> = {
  [K in FilterInternalMethods<keyof T>]: T[K]
};

type PublicStateType<T> =
  T extends StateObjectImpl<infer O> ?
  { [K in keyof O]: PublicStateType<O[K]> } & RemoveInternalMethods<StateObjectImpl<O>> :

  T extends StateTableImpl<infer O> ?
  Map<IdType<O>, PublicStateType<O>> & RemoveInternalMethods<StateTableImpl<O>> :

  T extends StateArrayImpl<infer O> ?
  Array<PublicStateType<O>> & RemoveInternalMethods<StateArrayImpl<O>> :

  T extends StateObjectArrayImpl<infer O> ?
  Array<PublicStateType<O>> & RemoveInternalMethods<StateObjectArrayImpl<O>> :

  T extends Function ? never :
  T;

export function createState<T>(state: T, options_?: {
  undoIgnore?: (propIds: StatePropIdentifiers<RootState<T>>) => PropId[],
})
  : RootState<T> {

  let propsIds = createPropIds<RootState<T>>();

  let options = {
    undoIgnoreProps: options_?.undoIgnore?.(propsIds) || []
  }

  return makeRootState(state, propsIds as PropId, options);

}

// interface Todo {
//   id: string,
//   description: string
// };
// let obj = createState({
//   todos: new StateTable<Todo>()
// });

// obj.todos._assertGet("i")._use("id")

// let propsIds = createPropIds(obj);
// let state = bindState(obj, propsIds, []);
// let state2 = _.assignIn(state, {
//   _revive: makeReviveState(propsIds, [])
// })
