// names:
//   NoBoS
//   nestr
//   
/* eslint-disable */

import _, { update } from "lodash";
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


function useNoboState(state: any, prop: any) {

  const [, setRefreshToggle] = useState({});
  const [value, setValue] = useState(state._get(prop));
  useEffect(() => {
    return state._subscribe(prop, () => {
      setValue(state._get(prop));
      setRefreshToggle({});
    });
  }, []);
  return value;
}



type SubscriberArray<T> = ((value: T) => void)[];

type StateKeyType<T> =
  T extends StateTableImpl<any> ? string :
  T extends StateObjectImpl<infer O> ? ObjectPropsKeys<O> :
  T extends StateArrayImpl<any> ? number : string;

type ObjectPropsKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];


class StateBaseClass<T> {
  _rootState: { _history : NoboHistory } | null = null;
  _parent: any | null = null;
  _propId: PropId;
  _ignoreProps: any[] = [];

  _subscribers: { [K in StateKeyType<T>]?: SubscriberArray<T> } = {};
  _parentListener: (() => void) | null = null;

  constructor(propIds: any, ignoreProps: any[]) {
    this._propId = propIds;
    this._ignoreProps = ignoreProps;
  }

  _getRootState() {
    let it = this;
    while (it._parent)
      it = it._parent;
    return it as any as { _history : NoboHistory } ;
  }

  _subscribe(propOrId: StateKeyType<T>, listener: (val: any) => void) {
    this._subscribers[propOrId] ||= [];
    let subs = this._subscribers[propOrId] as SubscriberArray<T>;
    subs.push(listener);
    return () => { _.remove(subs, s => s === listener); }
  }

  // A prop has been update.
  // notify subscribers and the parent.
  _notifySubscribers(propOrId: StateKeyType<T>, value: any) {

    this._subscribers[propOrId]?.forEach(sub => sub(value));
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
  if (toUpdate instanceof StateArrayImpl) {
    toUpdate._wrapped.length = src.length;
    for (let i = 0; i < src.length; i++) {
      if (isPrimitive(toUpdate._wrapped[i])) {
        toUpdate._wrapped[i] = src[i];
        toUpdate._notifySubscribers(i, toUpdate._wrapped[i]);
      }
      else
        updateState(toUpdate._wrapped, i, src[i]);
    }
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
    let newKeys = src._stateTable.map((e : any) => e.id);
    let idsToRemove = _.difference([... toUpdate.ids()], newKeys);
    for (let id of idsToRemove)
      toUpdate.remove(id);
    for (let elt of src._stateTable)
      if ((toUpdate as StateTable<any>).has(elt.id))
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

      // console.log(dst._getRootState()._wrapped._history);
      let history = dst._getRootState()._history;
      // console.log(history.push);
      history.push({
        action: "updateProp",
        target: dst._wrapped,
        prop: prop,
        propId: dst._propId[prop],
        prev,
        next: src
      } as HistoryUpdatePropAction);
    }

  }
}

export class StateArrayImpl<T> extends StateBaseClass<StateArrayImpl<T>>  {

  _wrapped = [] as StateType<T>[];

  get length() { return this._wrapped.length; }

  push(...elements: T[]) {
    elements.forEach(elt => {
      let o = bindState(elt, this._propId, this._ignoreProps);
      this._wrapped.push(o);
      this._registerChild(this._wrapped.length - 1, o);
      this._notifySubscribers(this._wrapped.length - 1, o);
      this._getRootState()._history.push({
        action: "push",
        propId: this._propId,
        target: this,
        element: o as StateType<T>
      } as HistoryArrayAction)
    });

  }

  pop() {
    return this._wrapped.pop();
  }

  _get(i: string | number | symbol) {
    if (i === "length") {
      // console.log("length!!");
      return this._wrapped.length;
    }

    return this._wrapped[i as number];
  }

  _set(i: number, val: T) {
    if (this._wrapped.length <= i)
      throw new Error(`StateArray: access out of bound (index: ${i}, array size: ${this._wrapped.length})`);
    updateState(this, i, val);
  }

  use(index: number) { useNoboState(this, index); }

  [Symbol.iterator]() {
    return this._wrapped[Symbol.iterator]();
  }
}

export interface HasId<T> { id: T };
type IdType<T> = T extends HasId<infer I> ? I : T;
export class StateTableImpl<O extends HasId<any>> extends StateBaseClass<StateTableImpl<O>>{

  _wrapped = new Map<IdType<O>, StateObject<O>>();

  use(propOrId: IdType<O>) { useNoboState(this, propOrId); }

  ids() { return this._wrapped.keys(); }
  insert(value: O) {
    let elt = bindState(value, this._propId, this._ignoreProps) as StateObject<O>;
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
      element: value
    } as HistoryTableAction)
  }

  has(id: IdType<O>) { return this._wrapped.has(id); }

  _get(id: IdType<O>) {
    let res = this._wrapped.get(id);
    if (!res) throw new Error(`StateTable get error: id ${id.toString()} does not exists`);
    return res;
  }

  _set(id: IdType<O>, val: O) {
    if (this._wrapped.has(id))
      updateState(this, id, val);
    else
      this.insert(val);
  }

  all() {
    return this._wrapped.values();
  }

  get size() {
    return this._wrapped.size;
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


type StateObjectData<T> = {
  [P in keyof T]: StateType<T[P]>;
}

class StateObjectImpl<T> extends StateBaseClass<StateObjectImpl<T>>{

  _wrapped: StateObjectData<T>;

  constructor(data: StateObjectData<T>, propIds: any, ignoreProps: any[]) {
    super(propIds, ignoreProps);

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

  _use(propOrId: ObjectPropsKeys<T>) { useNoboState(this, propOrId); }

};


function stateFactory<T>(ctor: any, ...args: any[]) {
  let wrapped = new ctor(...args);
  return new Proxy(wrapped, {
    get: (target, prop) => {
      if (target[prop] !== undefined || prop === "_revive" || prop === "_history")
        return target[prop];
      else
        return target._get(prop);
    },
    set: (target, prop, value) => {
      if (target[prop] !== undefined || prop === "_revive" || prop === "_history")
        target[prop] = value;
      else
        target._set(prop, value);
      return true
    },
  }) as T;
}

export type StateArray<T> = Array<StateType<T>> & StateArrayImpl<T>;
export type StateTable<T extends HasId<any>> = { [id : string] : StateType<T> } & StateTableImpl<T>;
export type StateObject<T> = { [K in keyof T]: StateType<T[K]> } & StateObjectImpl<T>;

const makeStateArray = <T>(...args: any[]) => stateFactory<StateArray<T>>(StateArrayImpl, ...args);
const makeStateObject = <T>(...args: any[]) => stateFactory<StateObject<T>>(StateObjectImpl, ...args);
const makeStateTable = <T extends HasId<any>>(...args: any[]) => stateFactory<StateTable<T>>(StateTableImpl, ...args);

export type PropId = { [key: string]: PropId } & { _propId: number };

type StatePropIdentifiers<T> =
  T extends null ? PropId :
  T extends string ? PropId :
  T extends number ? PropId :
  T extends StateArray<infer V> ? StatePropIdentifiers<V> :
  T extends StateTable<infer V> ? StatePropIdentifiers<V> :
  { [K in keyof T]: StatePropIdentifiers<T[K]> };

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

// function createStateMetadata<T>(root: T): StateMetadata<T> {
//   let cpt = 0;
//   return new Proxy({ propId: cpt++, root } as any, {
//     get: (target, prop) => {
//       let sprop = prop as string;
//       if (target[sprop])
//         return target[sprop];
//       else {
//         target[sprop] = { propId: cpt++, root: target.root };
//         return target[sprop];
//       }
//     }
//   }) as any as StateMetadata<T>;
// }


type StateType<T> =
  T extends null ? T :
  T extends string ? T :
  T extends number ? T :
  T extends StateTable<any> ? T :
  T extends Array<infer O> ? StateArray<O> :
  T extends RawTable<infer O> ? StateTable<O> :
  T extends Object ? StateObject<T> :
  T;


/**
 * From a plain javascript object, create a state object.
 * To create table:
 *   - { _stateTable: [...] }
 *   - new StateTable<T>()
 * To create an object: { props... }
 * @param state 
 * @param propId 
 * @param ignoreProps 
 */
function bindState<T>(state: T, propId: any, ignoreProps: any[]): StateType<T>;
function bindState<T>(state: any,
  propId = createPropIds() as any,
  ignoreProps: any[] = []): any {

  // Do not re-bind already bound objects.
  if (state._registerChild) return state;

  if (ignoreProps.find(p => p._propId === propId._propId)) {
    return state;
  }
  // map.
  else if (state._stateTable) {
    let table = makeStateTable(propId, ignoreProps);
    state._stateTable.forEach((elt: any) => table.insert(elt));
    return table;
  }
  // Array
  else if (state instanceof Array) {
    let arr = makeStateArray(propId, ignoreProps);
    arr.push(...state);
    return arr;
  }
  // Object
  else if (state instanceof Object) {
    let obj = {};
    for (let k in state)
      (obj as any)[k] = bindState(state[k], propId, ignoreProps);
    return makeStateObject(obj, propId, ignoreProps);
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
type UnwrapedType<T> = {
  [K in keyof T]:

  T[K] extends Function ? never :
  T[K] extends StateTable<infer O> ? { isStateTable: boolean, values: O[] } :
  UnwrapedType<T[K]>
};

export function unwrapState<T extends StateType<any>>(state: T): UnwrapedType<T>;
export function unwrapState<T extends StateType<any>>(state: T): any {
  if (state instanceof StateTableImpl) { // Table
    return { _stateTable: [...state.all()].map(v => unwrapState(v)) };
  }
  else if ((state as StateObjectImpl<any>)._wrapped) { // StateObject
    let obj = {} as any;
    let src = ((state as any)._wrapped as any);
    for (let k in src)
      if (typeof src[k] !== 'function' && !k.startsWith("_"))
        obj[k] = unwrapState(src[k]);
    return obj;
  }
  else if (state instanceof StateArrayImpl) { // Array
    let stateArray = state as StateArray<any>;
    let arr = [];
    for (let i = 0; i < stateArray.length; i++)
      arr.push(unwrapState(stateArray[i]));

  }
  return state;
}


type FilterInternalMethods<T> =
  T extends "_registerChild" | "_ignoreProps" | "_propsId" | "_notifySubscribers" |
  "_subscribers" | "_parentListener" | "_wrapped" |
  "_get" | "_set" | "_propId" ?
  never : T;

type RemoveInternalMethods<T> = {
  [K in FilterInternalMethods<keyof T>]: T[K]
};

type PublicStateType<T> =
  T extends StateObjectImpl<infer O> ?
  { [K in keyof O]: PublicStateType<StateType<O[K]>> } & RemoveInternalMethods<StateObjectImpl<O>> :

  T extends StateTableImpl<infer O> ?
  { [key: string]: PublicStateType<StateType<O>> } & RemoveInternalMethods<StateTableImpl<O>> :

  T extends StateArrayImpl<infer O> ?
  { [i: number]: PublicStateType<StateType<O>> } & RemoveInternalMethods<StateArrayImpl<O>> & { [Symbol.iterator](): Iterator<PublicStateType<StateType<O>>> } :
  T;

export function createState<T>(state: T, options_?: {
  ignoreProps?: (propIds: StatePropIdentifiers<StateType<T>>) => PropId[]
  undoIgnore?: (propIds: StatePropIdentifiers<StateType<T>>) => PropId[],
})
  : PublicStateType<StateType<T>> & {
    _revive: (data: any) => void
    _history: NoboHistory
  } {

  let propsIds = createPropIds<StateType<T>>();

  let options = {
    ignoreProps: options_?.ignoreProps?.(propsIds) || [],
    undoIgnoreProps: options_?.ignoreProps?.(propsIds) || []
  }

  // let metadata = createStateMetadata<StateType<T>>(propsIds);
  let b = bindState(state, propsIds, options.ignoreProps);
  
  return _.assign(b as PublicStateType<StateType<T>>, {
    _revive: (data: any) => {
      for (let k in data)
      {
        updateState(b, k, data[k]);
      }
      
      // updateState(b, )
      // let revived = bindState(data, propsIds, options.ignoreProps);
      // for (let k in revived._wrapped)
      // {
      //   console.log(k, revived._wrapped[k]._parentListener);
      //   (b as any)._wrapped[k] = revived._wrapped[k];
      //   if (revived._wrapped[k] && revived._wrapped[k]._parentListener)
      //     (b as any)._registerChild(k, revived._wrapped[k]);
      // }
      // console.log("revived", b);
      // _.assign(b, bindState(data, propsIds, options.ignoreProps)); 

    },
    _history: new NoboHistory(options.undoIgnoreProps)
  });
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
