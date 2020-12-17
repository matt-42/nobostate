import { StateArray, stateArrayMixin, StateObjectArray, stateObjectArrayMixin } from "./StateArray";
import { createPropIds, ReferenceSpec, PropSpec, StatePropIdentifiers, TablePropSpec } from "./prop";
import { makeRootState, RootState } from "./RootState";
import { StateBaseInterface } from "./StateBase";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { createProxy, StateObject, stateObjectMixin } from "./StateObject";
import { HasId, IdType, StateTable, stateTableMixin } from "./StateTable";


// type ReadOnly<T> =
//   T extends Array<any> ? T :
//   T extends Object ? {
//     readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
//   } : T;

// type ReadOnlyNonStateTypes<T> =
//   T extends StateBaseInterface<infer O> ? O :
//   T extends Object ? {
//     readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
//   } : T;


export const stateObject = <T>(data: T) =>
  createProxy(new (stateObjectMixin<T>())(data)) as any as StateObject<T>;

export const stateArray = <T>() => new (stateArrayMixin<T>())() as StateArray<T>;
export const stateObjectArray = <T>() => new (stateObjectArrayMixin<T>())() as StateObjectArray<T>;
export const stateTable = <T extends HasId<any>>() => new (stateTableMixin<T>())() as StateTable<T>;


// type FilterInternalMethods<T> =
//   T extends "_registerChild" | "_notifySubscribers" |
//   "_subscribers" | "_parentListener" |
//   "_get" | "_parent" ?
//   never : T;

// type RemoveInternalMethods<T> = {
//   [K in FilterInternalMethods<keyof T>]: T[K]
// };

// type PublicStateType<T> =
//   T extends StateObject<infer O> ?
//   { [K in keyof O]: PublicStateType<O[K]> } & RemoveInternalMethods<StateObject<O>> :

//   T extends StateTable<infer O> ?
//   Map<IdType<O>, PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateTable<O>> :

//   // T extends StateObjectArray<infer O> ?
//   // Array<PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateObjectArrayImpl<O>> :

//   T extends StateArray<infer O> ?
//   Array<PublicStateType<O>> & RemoveInternalMethods<StateArray<O>> :


//   T extends Function ? never :
//   T;


class SpecsBuilder {

  reference<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options? :
    {
      onRefDeleted?: "set-null" | "cascade" | ((elt: P, removed: T) => void)
      own?: boolean
    }
  ) {
    srcProp._onRefDeleted = options?.onRefDeleted || "set-null";
    srcProp._own = options?.own || false;
    srcProp._ref = dstTable as any;
  }

  referenceArray<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options? :
    {
      onRefDeleted?: ((elt: P, removed: T) => void)
      own?: boolean
    }
  ) {
    srcProp._onRefDeleted = options?.onRefDeleted || "set-null";
    srcProp._own = options?.own || false;
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
