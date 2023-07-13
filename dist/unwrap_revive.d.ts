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
import { StateArray } from "./StateArray";
import { StateObject } from "./StateObject";
import { StateTable } from "./StateTable";
declare type unwrappedObject = {
    _stateObject: any;
};
declare type unwrappedArray = {
    _stateArray: any[];
};
declare type unwrappedObjectArray = {
    _stateObjectArray: any[];
};
declare type unwrappedTable = {
    _stateTable: any[];
};
declare type unwrappedAny = unwrappedObject | unwrappedArray | unwrappedObjectArray | unwrappedTable;
export declare function reviveReferences(state: any, srcData: any): any;
export declare function revive(state: unwrappedAny): any;
export declare function revive2(state: unwrappedAny, parent: StateObject<any>, key: string): any;
/**
 * Extract state for serialization.
 * @param state
 */
declare type UnwrapedType<T> = T extends StateTable<infer O> ? {
    _stateTable: UnwrapedType<O>[];
} : T extends StateObject<infer O> ? {
    _stateObject: UnwrapedType<O>;
} : T extends StateArray<infer O> ? {
    _stateArray: UnwrapedType<O>[];
} : T;
export declare function unwrapState<T>(state: T): UnwrapedType<T>;
export {};
