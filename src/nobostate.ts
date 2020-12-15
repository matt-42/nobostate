import { StateArray, stateArrayMixin, StateObjectArray, stateObjectArrayMixin } from "./array";
import { createPropIds, ReferenceSpec, PropSpec, StatePropIdentifiers, TablePropSpec } from "./prop";
import { makeRootState, RootState } from "./RootState";
import { StateBaseInterface } from "./StateBaseClass";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { createProxy, StateObject, stateObjectMixin } from "./StateObjectImpl";
import { HasId, IdType, StateTable, stateTableMixin } from "./StateTable";


type ReadOnly<T> =
  T extends Array<any> ? T :
  T extends Object ? {
    readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
  } : T;

type ReadOnlyNonStateTypes<T> =
  T extends StateBaseInterface<infer O> ? O :
  T extends Object ? {
    readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
  } : T;

// type RootState<T> = PublicStateType<StateObject<T>> & { _load: (data: any) => void, _history: NoboHistory };
// type RootState<T> = StateObject<T> & { _load: (data: any) => void, _history: NoboHistory };


// export type StateArray<T> = Array<T> & StateArrayImpl<T>;
// export type StateObjectArray<T> = Array<StateObject<T>> & StateObjectArrayImpl<T>;
// export type StateTable<T extends HasId<any>> = Map<IdType<T>, StateObject<T>> & StateTableImpl<T>;
// export type StateObject<T> = { [K in keyof T]: ReadOnlyNonStateTypes<T[K]>; } & StateObjectImpl<T>;


// Factories.
// export const stateArray = <T>() => stateFactory<StateArray<T>>(StateArrayImpl);
// export const stateObjectArray = <T>() => stateFactory<StateObjectArray<T>>(StateObjectArrayImpl);
// export const stateObject = <T, A>(ctor: new (...args: A[]) => T, ...args: A[]) =>
//   createProxy(new (stateObjectMixin(ctor))(...args)) as StateObject<T>;
export const stateObject = <T>(data: T) =>
  createProxy(new (stateObjectMixin<T>())(data)) as any as StateObject<T>;

export const stateArray = <T>() => new (stateArrayMixin<T>())() as StateArray<T>;
export const stateObjectArray = <T>() => new (stateObjectArrayMixin<T>())() as StateObjectArray<T>;
export const stateTable = <T extends HasId<any>>() => new (stateTableMixin<T>())() as StateTable<T>;

//   class X {
//     test = 1;
//     xxx = "x";
//   };
// let obj = stateObject(X);

// export const stateTable = <T extends HasId<any>>() => stateFactory<StateTable<T>>(StateTableImpl);
// export function StateReference<T extends HasId<any>>(id: IdType<T> | null) { return new StateReference<T>(id); }

// export function StateReferenceNotNull<T extends HasId<any>>(id: IdType<T>) { return new StateReference<T, IdType<T>>(id); }
// export type StateReferenceNotNull<T extends HasId<any>> = StateReference<T, IdType<T>>;

// let x = {} as any as StateReferenceNotNull<{id : string}>
// let y = x.get();

type FilterInternalMethods<T> =
  T extends "_registerChild" | "_notifySubscribers" |
  "_subscribers" | "_parentListener" |
  "_get" | "_parent" ?
  never : T;

type RemoveInternalMethods<T> = {
  [K in FilterInternalMethods<keyof T>]: T[K]
};

type PublicStateType<T> =
  T extends StateObject<infer O> ?
  { [K in keyof O]: PublicStateType<O[K]> } & RemoveInternalMethods<StateObject<O>> :

  T extends StateTable<infer O> ?
  Map<IdType<O>, PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateTable<O>> :

  // T extends StateObjectArray<infer O> ?
  // Array<PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateObjectArrayImpl<O>> :

  T extends StateArray<infer O> ?
  Array<PublicStateType<O>> & RemoveInternalMethods<StateArray<O>> :


  T extends Function ? never :
  T;


class SpecsBuilder {

  reference<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options? :
    {
      onRefDeleted?: "set-null" | "cascade" | ((elt: P, removed: T) => void)
      onThisDeleted?: "cascade"
    }
  ) {
    srcProp._onRefDeleted = options?.onRefDeleted || "set-null";
    srcProp._onThisDeleted = options?.onThisDeleted || null;
    srcProp._ref = dstTable as any;
  }

  referenceArray<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options? :
    {
      onRefDeleted?: ((elt: P, removed: T) => void)
      onThisDeleted?: "cascade"
    }
  ) {
    srcProp._onRefDeleted = options?.onRefDeleted || "set-null";
    srcProp._onThisDeleted = options?.onThisDeleted || null;
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
