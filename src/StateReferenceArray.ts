import _ from "lodash";
import { StateObjectArray } from "./StateArray";
import { ReferenceSpec, PropSpec } from "./prop";
import { stateBaseMixin } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";
import { currentAutorunContext } from "./autorun";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { updateState } from "./updateState";


export class StateReferenceArray<T extends HasId<any>>
  extends stateBaseMixin<{}, typeof Object>(Object) {

  _wrapped: StateObject<T>[] = [];
  _isStateReferenceArray = true;
  _toInitialize: (IdType<T> | T)[];
  _refDisposers = new Map<IdType<T>, (() => void)[]>();

  constructor(array?: (IdType<T> | T)[]) {
    super();
    this._toInitialize = array || [];
    return this._proxifiedThis = new Proxy(this, {
      get: (target, prop, receiver) => {
        let res = Reflect.get(target, prop);

        if (typeof res === "function")
          return res.bind(target);
        else if (typeof prop === "number") {
          // console.log("access proxy number ", prop)
          return this.get(prop);
        }
        else if (typeof prop === "string" && !isNaN(parseInt(prop))) {
          // console.log("access proxy number ", prop, parseInt(prop))
          return this.get(parseInt(prop));
        }
        else {
          //if (!(prop as string).startsWith("_") && !res?._isStateBase)
          // console.log("access ", prop);
          currentAutorunContext?.accesses.set({ state: target as any, key: prop as string }, true);
          return res;
        }

      },
      set: (target, prop, value, receiver) => {
        // console.log(' set ',  prop, ' to ', value);
        if (typeof prop === "number" || typeof prop === "string" && !isNaN(parseInt(prop)))
          updateState(receiver, prop, value)
        else
          (target as any)[prop as string] = value;
        // (target as any)._set(prop, value);
        return true;
      },
    })
  }

  get length() {
    const l = this._wrapped.length;
    // console.log("get length ref array ");
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return l;
  }
  set length(l: number) {
    this._wrapped.length = l;
    // console.log("set length ref array ");
    this._notifyThisSubscribers();
  }

  [index: number]: StateObject<T>; // index access redirected to this.get 

  get(i: number) {
    currentAutorunContext?.accesses.set({ state: this as any, key: i as any }, true);
    return this._wrapped[i];
  }

  [Symbol.iterator]() {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped[Symbol.iterator]();
  }
  forEach(f: (elt: StateObject<T>, idx: number, array: StateObject<T>[]) => void) {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.forEach(f);
  }
  map<R>(f: (elt: StateObject<T>, idx: number, array: StateObject<T>[]) => R) {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.map(f);
  }
  findIndex(f: (elt: StateObject<T>) => boolean): number {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.findIndex(f);
  }

  _specs(): ReferenceSpec<any, any> {
    let specs = this._props as any as ReferenceSpec<any, any>;
    if (!specs) throw new Error();
    return specs;
  }

  _referencedTable(): StateTable<T> {
    let specs = this._specs();
    if (!specs || !specs._ref) throw new Error();
    return this._rootStateAccess(specs._ref._path);
  }


  _setProps(props: PropSpec) {
    if ((props as ReferenceSpec<any, any>)._ref === undefined) {
      throw Error(`Unspecified reference array ${props._path.join('.')}:
        Use specs.referenceArray(props.${props._path.join('.')}, dstTable, options) to specify it.`);
    }

    super._setProps(props);


    this._parent._onRemoveInternal(() => {

      if (this._specs()._own) {
        // console.log(this);
        // remove refs when we own the ref and when the parent stateobject is deleted.

        while (this.length)
          (this._wrapped[0]._parent as StateTable<T>).remove(this._wrapped[0].id);

      }

      // dispose all refs.
      for (let disposers of this._refDisposers.values())
        disposers.forEach(f => f());
      this._refDisposers.clear();
      this.length = 0;

    });

    this.push(...this._toInitialize);
    this._toInitialize.length = 0;
  }

  clear() {
    this.remove(() => true);
  }

  disposeRemovedElement(o: StateObject<T>) {
    // dispose ref and clear disposers.
    let disposers = this._refDisposers.get(o.id);

    // check if there is another  occurence of o in the array.
    if (-1 !== this._wrapped.findIndex(x => x === o))
      return;

    if (!disposers?.length) {
      throw new Error();
    }

    if (disposers) {
      disposers.forEach(f => f());
      this._refDisposers.delete(o.id);
    }
  }
  registerNewElement(ref: StateObject<T>) {

    // Init disposers.
    this._refDisposers.set(ref.id, []);
    let refDisposer = this._refDisposers.get(ref.id);
    if (!refDisposer) throw new Error();

    // Add the back reference.
    refDisposer.push(ref._addBackReference(this._specs(), this._parent));

    // Listen to change in ref.
    // Actually no, do not forward notifications. let the user decide with ref he want to listen to.
    // Forwarding changes in ref lead to too many unneeded notifications.
    // refDisposer.push(ref._onChange(() => this._notifyThisSubscribers()));

    // Setup on ref delete behaviors.
    refDisposer.push(ref._onRemoveInternal(() => {
      let spec = this._specs();
      this.remove(r => r === ref);

      if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
        spec._onRefDeleted(this._parent, ref);
    }));

  }

  remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[] {
    let indicesToRemove: number[] = [];
    this.forEach((val, idx) => { if (filter(val)) indicesToRemove.push(idx); });

    const elementsRemoved: StateObject<T>[] = []
    indicesToRemove.forEach((index, indexPosition) => {


      let actualIndex = index - indexPosition;
      let o = this._wrapped.splice(actualIndex, 1)[0] as StateObject<T>;
      if (!o) throw new Error();

      this._logger()?.groupLog(`Remove id ${o.id} from reference Array ${this._path()}`);

      elementsRemoved.push(o);
      this._getRootState()._history.push({
        action: "anyAction",
        target: this,
        propId: this._props,
        undo: () => this.insert(o, actualIndex),
        redo: () => this.remove(x => x.id === o.id),
      });


      this.disposeRemovedElement(o);

      // remove the refd object if we own it.
      if (this._specs()._own)
        (o._parent as StateTable<T>).remove(o.id);

      this._logger()?.groupEnd();
    });
    if (elementsRemoved.length > 0)
      this._notifyThisSubscribers();
    return elementsRemoved;
  }

  _internalSet(index: number, obj: StateObject<T>) {
    // if (index < 0 || index >= this.length) {
    //   throw new Error(`StateReferenceArray error: index out of bound: ${index} current length is ${this.length}`);
    // }
    if (this._wrapped[index])
      this.disposeRemovedElement(this._wrapped[index]);
    this._wrapped[index] = obj;
    this.registerNewElement(obj);
  }

  insert(elt: IdType<T> | T | StateObject<T>, index: number) {

    this._logger()?.groupLog(`Insert into reference Array ${this._path()} at position ${index}: `);
    this._logger()?.log(elt);

    if (Array.isArray(elt))
      throw new Error("type error: referenceArray::push takes elements, not array. Use push(...array) instead.");
    let ref: StateObject<T> | null = null;
    if ((elt as StateObject<T>)._isStateBase) {
      ref = elt as StateObject<T>;
      if (!this._referencedTable().has(ref.id))
        this._referencedTable().insert(ref as StateObject<T>);
    }
    else if ((elt as any)?.id !== undefined) {
      ref = this._referencedTable().insert(elt as T);
    }
    else {
      ref = this._referencedTable().get(elt as IdType<T>) || null;
      if (!ref) throw new Error(`StateReferenceArray error: trying to create a ref to the non existing id ${elt} 
          of table '${this._referencedTable()._path()}`);
    }

    if (!ref) throw new Error();

    this._wrapped.splice(index, 0, ref);

    this._getRootState()._history.push({
      action: "anyAction",
      target: this,
      propId: this._props,
      undo: () => this.remove(o => o.id === ref?.id),
      redo: () => { if (ref) this.push(ref); }
    });

    this.registerNewElement(ref);
    this._logger()?.groupEnd();
  }

  push(...elements: (IdType<T> | T | StateObject<T>)[]): number {

    // insertion of all elements grouped makes 1 history group.
    this._getRootState()._history.group(() => {
      elements.forEach(elt => {
        this.insert(elt, this.length);
      });
    });

    if (elements.length)
      this._notifyThisSubscribers();

    return this.length;
  }

  pop() {
    const res = this._wrapped.pop();
    this._notifyThisSubscribers();
    return res;
  }
}

// export type StateReferenceArray<T> = {
//   _isStateReferenceArray: boolean;
//   _toInitialize: (IdType<T> | T)[];
//   clear(): void;
//   remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[];
//   push(...elements: (IdType<T> | T | StateObject<T>)[]): number;

// } & StateObjectArray<T>;

export function stateReferenceArray<T extends HasId<any>>(elts?: (T | IdType<T>)[]): StateReferenceArray<T> {
  return new StateReferenceArray<T>(elts);
}