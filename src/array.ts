import _ from "lodash";
import { HistoryArrayAction } from "./history";
import { stateObject } from "./nobostate";
import { propagatePropIds } from "./prop";
import { Constructor, StateBaseInterface, stateBaseMixin } from "./StateBaseClass";
import { anyStateObject, StateObject, stateObjectMixin } from "./StateObjectImpl";
import { updateState } from "./updateState";


export function copyStateArray(dst_: StateArray<any> | StateObject<any>, src: any) {

  let dst = dst_ as StateArray<any>;

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

let x = new (stateArrayMixin<{ id: number }>());

// let X = typeof  new (stateArrayMixin<{id : number}>());

type R = ReturnType<typeof stateArrayMixin>

// type T = (typeof stateArrayMixin)<{
//   id: number;
// }>.StateArray


export function stateArrayMixin<T>() {

  return class StateArray extends stateBaseMixin<T[], Constructor<T[]>>(Array as Constructor<T[]>)
  {

    push(...elements: T[]): number {
      elements.forEach(elt => {
        super.push(elt);
        this._notifySubscribers(this.length - 1, elt);
        this._getRootState()._history.push({
          action: "push",
          propId: this._props,
          target: this,
          element: elt
        } as HistoryArrayAction)
      });
      return this.length;
    }

    remove(index: number) {
      this.splice(index, 1);
      for (let i = index; i < this.length; i++)
        this._notifySubscribers(i, this[i]);

    }

    clear() {
      this.length = 0;
      this._parentListener?.();
      this._thisSubscribers.map(s => s(this, -1));
    }
    copy(other: T[]) { copyStateArray(this, other); }

  }
}


export function stateObjectArrayMixin<T>() {

  return class StateObjectArray extends stateArrayMixin<StateObject<T>>()
  {

    push(...elements: T[]): number {
      elements.forEach(value => {

        let elt = stateObject<T>(value);
        super.push(elt);
        this._registerChild(this.length - 1, elt);
        propagatePropIds(elt, this._props);
      });
      return this.length;
    }

  }
}

export interface StateArrayInterface<T> extends StateBaseInterface<T[]> {
  push(...elements: T[]): number;
  remove(index: number): void;
  clear(): void;
  copy(other: T[]): void;
}

export interface StateObjectArrayInterface<T> extends StateArrayInterface<StateObject<T>> {
  push(...elements: T[]): number;
}

export type StateArray<T> = StateArrayInterface<T> & T[];
export type StateObjectArray<T> = StateObjectArrayInterface<T> & StateObject<T>[];
// export type StateArray<T> = StateObjectArrayInterface<T> & T[];
