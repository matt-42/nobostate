import { PropSpec, ReferenceSpec, StatePropIdentifiers, TablePropSpec } from "./prop";
import { RootState } from "./RootState";
import { StateArray, StateObjectArray } from "./StateArray";
import { StateObject } from "./StateObject";
import { HasId, StateTable } from "./StateTable";
export declare const stateObject: <T>(data: T) => StateObject<T>;
export declare const stateArray: <T>() => StateArray<T>;
export declare const stateObjectArray: <T>() => StateObjectArray<T>;
export declare const stateTable: <T extends HasId<any>>() => StateTable<T>;
declare class SpecsBuilder {
    reference<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options?: {
        onRefDeleted?: "set-null" | "cascade" | ((elt: P, removed: T) => void);
        own?: boolean;
    }): void;
    referenceArray<P, T>(srcProp: ReferenceSpec<any, P>, dstTable: TablePropSpec<T>, options?: {
        onRefDeleted?: ((elt: P, removed: T) => void);
        own?: boolean;
    }): void;
    undoIgnore(prop: PropSpec): void;
}
export declare function createState<T>(state: T, options?: {
    log?: boolean;
    setSpecs?: (propIds: StatePropIdentifiers<T>, specs: SpecsBuilder) => void;
}): RootState<T>;
export {};
