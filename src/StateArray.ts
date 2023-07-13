import { currentAutorunContext } from "./autorun";
import { HistoryArrayAction } from "./history";
import { stateObject } from "./nobostate";
import { propagatePropIds } from "./prop";
import { Constructor, StateBaseInterface, stateBaseMixin } from "./StateBase";
import { StateObject } from "./StateObject";
import { StateReferenceArray } from "./StateReferenceArray";
import { updateState } from "./updateState";


export function copyStateArray(dst_: StateArray<any> | StateObjectArray<any> | StateReferenceArray<any>, src: any) {

  let dst = dst_ as StateArray<any>;

  if ((dst_ as StateReferenceArray<any>)._isStateReferenceArray) {
    dst.clear();

    let srcArray = src as StateReferenceArray<any>;
    if (!srcArray._isStateReferenceArray)
      throw new Error("reference array copy, type error.");

    dst.push(...(srcArray._toInitialize || srcArray));
    return;
  }
  // Resize dst array if too large.
  while (dst.length > src.length)
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


// export class StateObjectArrayImpl<T> extends
//   StateBaseClass<StateObjectArrayImpl<T>, { [K in keyof T]: StatePropIdentifiers<T[K]> } & PropSpec>  {

//   _isObjectArray = true; // Just to differenciate with StateArrayImpl
//   _wrapped = [] as StateObject<T>[];

//   push(...elements: T[]) {
//     elements.forEach(elt => {
//       let o: StateObject<T> = elt instanceof StateBaseClass ? elt as any : stateObject(elt);

//       // let o = stateObject<T>(elt, this._propId);
//       propagatePropIds(o, this._props);

//       this.push(o);
//       this._registerChild(this.length - 1, o);
//       this._notifySubscribers(this.length - 1, o);
//       this._getRootState()._history.push({
//         action: "push",
//         propId: this._props,
//         target: this,
//         element: o
//       } as HistoryArrayAction)
//     });

//   }
//   remove(index: number) {
//     this.splice(index, 1);
//     for (let i = index; i < this.length; i++)
//       this._notifySubscribers(i, this[i]);

//   }

//   clear() {
//     this.length = 0;
//     this._parentListener?.();
//     this._thisSubscribers.map(s => s(this, -1));
//   }
//   copy(other: T[]) { copyStateArray(this, other); }

//   _get(i: number) {
//     return this[i as number];
//   }

//   _set(i: number, val: T) {
//     if (this.length <= i)
//       throw new Error(`StateArray: access out of bound (index: ${i}, array size: ${this.length})`);
//     updateState(this, i, val);
//   }

//   _use(): StateObjectArray<T>
//   _use(index: number): T
//   _use(index?: any): any { return useNoboState(this, index); }

//   _subscribe(listener: Subscriber<StateObjectArray<T>>): () => void
//   _subscribe(propOrId: string, listener: Subscriber<T>): () => void
//   _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }

// }

// type StateArray2 = ReturnType<typeof stateArrayMixin>;

// let x = new (stateArrayMixin<{ id: number }>());

// let X = typeof  new (stateArrayMixin<{id : number}>());

// type R = ReturnType<typeof stateArrayMixin>

// type T = (typeof stateArrayMixin)<{
//   id: number;
// }>.StateArray


export class StateArray<T> extends stateBaseMixin<{}, typeof Object>(Object)
{
  _wrapped = [] as T[];
  _isStateArray = true;

  constructor() {
    super();
    this._proxifiedThis = new Proxy(this, {
      get: (target, prop, receiver) => {
        let res = Reflect.get(target, prop);

        // console.log("access proxy  ", prop, typeof prop)

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
    });
    return this._proxifiedThis;
  }
  get length() {
    const l = this._wrapped.length;
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return l;
  }
  set length(l: number) {
    this._wrapped.length = l;
    this._notifyThisSubscribers();
  }

  [index: number] : T; // index access redirected to this.get 
  get(i : number) { 
    currentAutorunContext?.accesses.set({ state: this as any, key: i as any }, true);
    return this._wrapped[i]; 
  }

  [Symbol.iterator]() {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped[Symbol.iterator]();
  }
  forEach(f: (elt: T, idx: number, array: T[]) => void) {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.forEach(f);
  }
  map<R>(f: (elt: T, idx: number, array: T[]) => R) {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.map(f);
  }
  findIndex(f: (elt: T) => boolean) : number {
    currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
    return this._wrapped.findIndex(f);
  }

  push(...elements: T[]): number {
    elements.forEach(elt => {
      this._wrapped.push(elt);
      this._notifySubscribers(this.length - 1 as never, elt as never);
      this._getRootState()?._history?.push({
        action: "push",
        propId: this._props,
        target: this as any,
        element: elt
      } as HistoryArrayAction)
    });
    return this.length;
  }
  _internalSet(index: number, val: T) {
    this._wrapped[index] = val;
  }

  remove(index: number) {
    this._wrapped.splice(index, 1);
    if (index === this.length)
      this._notifyThisSubscribers();
    else
      for (let i = index; i < this.length; i++)
        this._notifySubscribers(i as never, this._wrapped[i] as never);
    

  }

  pop() {
    const res = this._wrapped.pop();
    this._notifyThisSubscribers();
    return res;
  }

  clear() {
    this.length = 0;
    this._parentListener?.();
    this._thisSubscribers.map(s => s(this, -1 as never));
  }
  copy(other: T[]) { copyStateArray(this as any, other); }

}


export class StateObjectArray<T> extends StateArray<T>
{
  _isStateObjectArray = true;

  push(...elements: T[]): number {
    elements.forEach(value => {

      let elt = (value as any)._isStateObject ? value : stateObject<T>(value);
      super.push(elt);
      this._registerChild(this.length - 1 as never, elt as never);
      propagatePropIds(elt, this._props);
    });
    return this.length;
  }

}


export interface StateArrayInterface<T> extends StateBaseInterface<T[]> {
  _isStateArray: boolean;
  push(...elements: T[]): number;
  remove(index: number): void;
  clear(): void;
  copy(other: T[]): void;
}

export interface StateObjectArrayInterface<T> extends StateArrayInterface<T> {
  _isStateObjectArray: boolean;
  push(...elements: T[]): number;
}

// export type StateArray<T> = StateArrayInterface<T>;
// export type StateObjectArray<T> = StateObjectArrayInterface<T>;

