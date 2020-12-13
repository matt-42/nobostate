import _ from "lodash";
import { useEffect, useState } from "react";
import { HistoryArrayAction, HistoryTableAction, HistoryUpdatePropAction, NoboHistory } from "./history";


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
  T extends StateForeignKey<any> ? "id" :
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
  T extends StateObjectImpl<infer O> ? StateObject<O> :
  T extends StateArrayImpl<infer O> ? StateArray<O> :
  T extends StateObjectArrayImpl<infer O> ? StateObjectArray<O> :
  T;

export class StateBaseClass<T> {
  _parent: any | null = null;
  _propId: PropSpec = null as any;

  _subscribers: { [K in StateKeyType<T>]?: SubscriberArray<T> } = {};
  _thisSubscribers: SubscriberArray<T> = [];
  _parentListener: (() => void) | null = null;

  _getRootState() {
    let it = this;
    while (it._parent)
      it = it._parent;
    return it as any as { _history: NoboHistory };
  }

  _rootStateAccess(path: string[]) {
    let elt: any = this._getRootState();
    for (let key of path)
      elt = elt._get(key);
    return elt;
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

function copyStateArray(dst_: StateArrayImpl<any> | StateObjectArrayImpl<any>, src: any) {
  const isPrimitive = (o: any) => !(o instanceof StateObjectImpl ||
    o instanceof StateArrayImpl ||
    o instanceof StateTableImpl);

  let dst = dst_ as StateArray<any>;

  // Resize dst array if too large.
  while (dst._wrapped.length > src.length)
    dst.pop();

  // Update existing elements of the array.
  for (let i = 0; i < dst.length; i++)
    updateState(dst, i, src[i]);

  // Insert new elements.
  for (let i = dst.length; i < src.length; i++) {
    dst.push(src[i]);
  }
  // Check that arrayToUpdate and src have the same size.    
  if (dst.length != src.length)
    throw new Error();
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
    copyStateArray(toUpdate, src);
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
      // console.log(dst._propId);
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
  _wrapped = [] as StateObject<T>[];

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
  remove(index: number) {
    this._wrapped.splice(index, 1);
    for (let i = index; i < this._wrapped.length; i++)
      this._notifySubscribers(i, this._wrapped[i]);

  }

  clear() {
    this._wrapped.length = 0;
    this._parentListener?.();
    this._thisSubscribers.map(s => s(this, -1));
  }
  copy(other: T[]) { copyStateArray(this, other); }

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
  remove(index: number) {
    this._wrapped.splice(index, 1);
    for (let i = index; i < this._wrapped.length; i++)
      this._notifySubscribers(i, this._wrapped[i]);

  }

  clear() {
    this._wrapped.length = 0;
    this._parentListener?.();
    this._thisSubscribers.map(s => s(this, -1));
  }
  copy(other: T[]) { copyStateArray(this, other); }

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
  find(predicate: (o: StateObject<O>) => boolean) { return [...this._wrapped.values()].find(predicate); }

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

  set(value: O) {
    if (!this._wrapped.has(value.id))
      return this.insert(value);
    else this._set(value.id, value);
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
    let eltToDelete = this._wrapped.get(id);
    this._wrapped.delete(id);

    // Manage foreign keys.
    for (let c of (this._propId as TablePropSpec<any>)._foreignKeys) {
      let { srcProp, trigger } = c;
      let tablePath = [...srcProp._path];
      let key = tablePath.pop();

      if (!key) {
        throw new Error(`Foreign key path is empty`);
      }
      let table = this._rootStateAccess(tablePath) as StateTable<any> | StateObjectArray<any>;
      if (!(table instanceof StateTableImpl || table instanceof StateObjectArrayImpl))
        throw new Error(`Foreign key ref ${tablePath.join(".")} is not a table or an array`);

      let toRemove: any[] = [];
      table.forEach((elt: any) => {
        let ref = elt[key as string] as StateForeignKey<any>;
        if (ref.getId() === id) {
          if (trigger === "cascade")
            toRemove.push(elt.id);
          else if (trigger === "set-null")
            ref.set(null);
          else
            trigger(elt, eltToDelete);
        }
      });
      for (let id of toRemove) table.remove(id);
    }

    this._notifySubscribers(id, null);
    this._getRootState()._history.push({
      action: "remove",
      propId: this._propId,
      target: this,
      element: eltToDelete
    } as HistoryTableAction)
  }

  _useMapSelector<R>(mapSelector: (o: O) => R) {
    return this._useSelector(table => [...table.values()].map(mapSelector));
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
  T extends StateForeignKey<infer O> ? StateForeignKey<O> :
  T extends StateObject<infer O> ? StateObject<O> :
  T extends StateTable<infer O> ? StateTable<O> :
  T extends StateArray<infer O> ? StateArray<O> :
  T extends StateObjectArray<infer O> ? StateObjectArray<O> :
  ReadOnly<T>;

// type RootState<T> = PublicStateType<ReadOnlyNonStateTypes<StateObject<T>>> & { _load: (data: any) => void, _history: NoboHistory };
type RootState<T> = PublicStateType<StateObject<T>> & { _load: (data: any) => void, _history: NoboHistory };
// type RootState<T> = StateObject<T> & { _load: (data: any) => void, _history: NoboHistory };


function makeRootState<T>(state: T, propId: PropSpec) {

  let obj = {} as any;
  for (let k in state)
    (obj as any)[k] = state[k];
  let wrapped = new StateObjectImpl<T>(obj);

  propagatePropIds(wrapped, propId as PropSpec);

  let proxy = createProxy<RootState<T>>(_.assign(wrapped, {

    // Load plain data into the state.
    _load: (data: any) => {
      let loadedState = bindState(data);
      for (let k in loadedState)
        updateState(proxy, k, loadedState[k]);
    },

    // State action history.
    _history: new NoboHistory()

  }));

  return proxy;
}

export type StateArray<T> = Array<T> & StateArrayImpl<T>;
export type StateObjectArray<T> = Array<T> & StateObjectArrayImpl<T>;
export type StateTable<T extends HasId<any>> = Map<IdType<T>, T> & StateTableImpl<T>;
export type StateObject<T> = { [K in keyof T]: ReadOnlyNonStateTypes<T[K]>; } & StateObjectImpl<T>;

type xxx = StateObject<number | null>;
// StateObject<T | null> = T & StateObjectImpl<T>;
// Factories.
export const stateArray = <T>() => stateFactory<StateArray<T>>(StateArrayImpl);
export const stateObjectArray = <T>() => stateFactory<StateObjectArray<T>>(StateObjectArrayImpl);
export const stateObject = <T>(data: T) => stateFactory<StateObject<T>>(StateObjectImpl, data);
export const stateTable = <T extends HasId<any>>() => stateFactory<StateTable<T>>(StateTableImpl);

export function stateForeignKey<T extends HasId<any>>(id: IdType<T> | null) { return new StateForeignKey<T>(id); }
export class StateForeignKey<T extends HasId<any>> extends StateBaseClass<StateForeignKey<T>> {
  _isForeignKey = true;
  _id: IdType<T> | null = null;

  constructor(id: IdType<T> | null) {
    super();
    this._id = id;
  }

  getId() { return this._id; }
  get() {
    let specs = this._propId as ForeignKeySpec<T>;
    if (!specs || !specs._ref) throw new Error();

    // state.table1.object1.subtable1.ref1
    // state.table1.object1.subtable2.ref2
    // state.table1.object1.subtable1.ref1 = state.table1.object1.subtable2

    // access the referenced element.
    return this._rootStateAccess(specs._ref._path).get(this._id) as T;
  }

  set(id: IdType<T> | null) {
    let prev = this._id;
    this._id = id;
    this._notifySubscribers("id" as any, id);

    let history = this._getRootState()._history;
    history.push({
      action: "updateProp",
      target: this,
      prop: "id",
      propId: (this._propId as any)["id"],
      prev,
      next: id
    } as HistoryUpdatePropAction);

  }
}

// export type NonLeafPropSpec = { [key: string]: PropSpec };

export type PropSpec = {
  _path: string[],
  _propId: number,
  _undoIgnore?: boolean,
};
export type ForeignKeySpec<T> = PropSpec & {
  _ref?: PropSpec,
};

type TablePropSpec<T> = PropSpec & {
  _foreignKeys: {
    trigger: "cascade" | "set-null" | ((target: any, removeElement: any) => void),
    srcProp: PropSpec
  }[];
};

// export type PropSpec = LeafPropSpec;

type StatePropIdentifiers<T> =
  T extends StateForeignKey<infer V> ? ForeignKeySpec<V> :
  T extends StateObject<infer V> ? PropSpec & { [K in keyof V]: StatePropIdentifiers<V[K]> } :
  T extends StateArray<any> ? PropSpec :
  T extends StateObjectArray<infer V> ? StatePropIdentifiers<StateObject<V>> :
  T extends StateTable<infer V> ? TablePropSpec<V> & StatePropIdentifiers<StateObject<V>> :
  PropSpec;



// export class StateForeignKey2<T> extends StateBaseClass<any> {
//   _isForeignKey = true;
//   _specs: ForeignKeySpec | null = null;
//   _id: IdType<T> | null = null;


// }
// type Test = {id : string, xx: number}
// type S = StatePropIdentifiers<StateObject<{id : string, 
//   xxxx: StateForeignKey<Test>
//   // xxxx: StateForeignKey2<Test>
//   // xxxx: Test
// }>>

// // type S = StatePropIdentifiers<StateForeignKey2<Test>>
// // type S = StatePropIdentifiers<StateObject<{xxxx : StateForeignKey2<Test> }>>

// let x = {} as S;
// x.xxxx;

function createPropIds<T>(options_?: { path: string[], getNextId: () => number }): StatePropIdentifiers<T> {
  let cpt = 0;

  let options = options_ || {
    path: [], getNextId: () => { return cpt++; }
  }

  let target: TablePropSpec<any> = {
    _path: options.path,
    _propId: options.getNextId(),
    _undoIgnore: false,
    _foreignKeys: []
  };

  return new Proxy(target, {
    get: (target: any, prop, receiver) => {
      let sprop = prop as string;
      if (target[sprop] !== undefined)
        return target[sprop];
      else {
        // console.log("create prop", sprop);
        target[sprop] = createPropIds({ path: [...options.path, sprop], getNextId: options.getNextId });
        return target[sprop];
      }
    }
  }) as any as StatePropIdentifiers<T>;
}


function propagatePropIds<T>(state: T, propId: PropSpec): void {

  if (state instanceof StateBaseClass)
    state._propId = propId;

  if (state instanceof StateTableImpl) {
    for (let obj of (state as any as StateTable<any>).values())
      propagatePropIds(obj, propId);
  }
  else if (state instanceof StateObjectImpl) {
    for (let k in state._wrapped)
      propagatePropIds(state._wrapped[k], (propId as any)[k]);
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


class SpecsBuilder {

  foreignKey<S, T>(srcProp: ForeignKeySpec<S>, dstTable: TablePropSpec<T>,
    mode: "set-null" | "cascade" | ((elt: S, removed: T) => void) = "set-null"
  ) {
    dstTable._foreignKeys.push({ trigger: mode, srcProp: srcProp as any });
    srcProp._ref = dstTable as any;
  }

  undoIgnore(prop: PropSpec) {
    prop._undoIgnore = true;
  }
}

export function createState<T>(state: T, options?: {
  setSpecs?: (propIds: StatePropIdentifiers<StateObject<T>>, specs: SpecsBuilder) => void,
})
  : RootState<T> {

  let propsIds = createPropIds<StateObject<T>>();

  options?.setSpecs?.(propsIds, new SpecsBuilder());

  return makeRootState(state, propsIds as PropSpec);

}
