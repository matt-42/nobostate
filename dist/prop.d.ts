import { StateArray, StateObjectArray } from "./StateArray";
import { StateObject } from "./StateObject";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { StateTable } from "./StateTable";
export declare type PropSpec = {
    _path: string[];
    _propId: number;
    _undoIgnore?: boolean;
};
export declare type ReferenceSpec<T, Parent> = PropSpec & {
    _ref: TablePropSpec<T>;
    _onRefDeleted: "cascade" | "set-null" | ((target: any, removeElement: any) => void);
    _own: boolean;
} & {
    _: Parent;
};
export declare type TablePropSpec<T> = PropSpec & {} & {
    _: T;
};
export declare type StatePropIdentifiers2<T, Parent = never> = T extends StateReferenceNotNull<infer V> ? ReferenceSpec<V, Parent> : T extends StateReference<infer V> ? ReferenceSpec<V, Parent> & {
    [K in keyof V]: StatePropIdentifiers2<V[K], StateObject<V>>;
} : T extends StateReferenceArray<infer V> ? ReferenceSpec<V, Parent> : T extends StateObject<infer V> ? PropSpec & {
    [K in keyof V]: StatePropIdentifiers2<V[K], T>;
} : T extends StateObjectArray<infer V> ? PropSpec & StatePropIdentifiers2<StateObject<V>> : T extends StateArray<any> ? PropSpec : T extends StateTable<infer V> ? TablePropSpec<V> & StatePropIdentifiers2<StateObject<V>> : PropSpec;
export declare type StatePropIdentifiers<T> = T extends StateReferenceNotNull<infer V> ? ReferenceSpec<V, never> : T extends StateReference<infer V> ? ReferenceSpec<V, never> : T extends StateReferenceArray<infer V> ? ReferenceSpec<V, never> : T extends StateObjectArray<infer V> ? PropSpec & StatePropIdentifiers2<StateObject<V>> : T extends StateArray<any> ? PropSpec : T extends StateTable<infer V> ? TablePropSpec<V> & StatePropIdentifiers2<StateObject<V>> : T extends {
    __stateReference__: infer O;
} ? PropSpec & StatePropIdentifiers2<StateReference<O>> : T extends (infer O)[] ? PropSpec & StatePropIdentifiers2<StateObject<O>> : T extends Array<infer O> ? PropSpec & StatePropIdentifiers2<StateObject<O>> : T extends Map<any, infer O> ? TablePropSpec<O> & StatePropIdentifiers2<StateObject<O>> : PropSpec & {
    [K in keyof T]: StatePropIdentifiers2<T[K], StateObject<T>>;
};
export declare function createPropIds<T>(options_?: {
    path: string[];
    getNextId: () => number;
}): StatePropIdentifiers<T>;
export declare function propagatePropIds(state: any, propId: PropSpec): void;
