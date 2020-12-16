import { StateArray, stateArrayMixin, StateObjectArray } from "./array";
import { StateBaseInterface, stateBaseMixin } from "./StateBaseClass";
import { StateReference } from "./StateReference";;
import { StateObject, stateObjectMixin } from "./StateObjectImpl";
import { StateTable, stateTableMixin } from "./StateTable";
import { StateReferenceArray } from "./StateReferenceArray";
import { createState, stateTable, stateArray, stateObjectArray } from "./nobostate";


export type PropSpec = {
  _path: string[],
  _propId: number,
  _undoIgnore?: boolean,
};
export type ReferenceSpec<T, Parent> = PropSpec & {
  _ref?: TablePropSpec<T>,
  _onRefDeleted: "cascade" | "set-null" | ((target: any, removeElement: any) => void),
  _own: boolean,

} & { _: Parent };

export type TablePropSpec<T> = PropSpec & {
} & { _: T };

export type StatePropIdentifiers<T, Parent = never> =
  T extends StateReference<infer V> ? ReferenceSpec<V, Parent> :
  T extends StateReferenceArray<infer V> ? ReferenceSpec<V, Parent> :
  T extends StateObject<infer V> ? PropSpec & { [K in keyof V]: StatePropIdentifiers<V[K], StateObject<V>> } :
  T extends StateObjectArray<infer V> ? PropSpec & StatePropIdentifiers<StateObject<V>> :
  T extends StateArray<any> ? PropSpec :
  T extends StateTable<infer V> ? TablePropSpec<V> & StatePropIdentifiers<StateObject<V>> :
  PropSpec;


type X = StatePropIdentifiers<StateObject<{ x: number }>>

export function createPropIds<T>(options_?: { path: string[], getNextId: () => number }): StatePropIdentifiers<T> {
  let cpt = 0;

  let options = options_ || {
    path: [], getNextId: () => { return cpt++; }
  }

  let target: TablePropSpec<any> = {
    _path: options.path,
    _propId: options.getNextId(),
    _undoIgnore: false,
    _foreignKeys: []
  } as any;

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


export function propagatePropIds(state: any, propId: PropSpec): void {

  if (!propId) return;

  if (state?._isStateBase === true)
    (state as any as StateBaseInterface<any>)._setProps(propId as any);

  if (state?._isStateTable === true) {
    let values = (state as any as StateTable<any>).values();
    for (let obj of values)
      propagatePropIds(obj, propId);
  }
  else if (state?._isStateObject === true) {
    for (let k in state) {
      if (!k.startsWith("_"))
        propagatePropIds(state[k], (propId as any)[k]);
    }
  }
  else if (state?._isStateArray === true) {// || state instanceof StateObjectArray) {
    for (let k of state as any as StateArray<any>)
      propagatePropIds(k, propId);
  }

}
