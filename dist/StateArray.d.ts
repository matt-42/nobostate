import { StateBaseInterface } from "./StateBase";
import { StateReferenceArray } from "./StateReferenceArray";
export declare function copyStateArray(dst_: StateArray<any> | StateObjectArray<any> | StateReferenceArray<any>, src: any): void;
declare const StateArray_base: {
    new (...args: any[]): {
        _isStateBase: boolean;
        __removed__: boolean;
        _proxifiedThis: any | null;
        _parent: any;
        _props: import("./prop").PropSpec & {};
        _subscribers: {
            [K: string]: ((value: any, key: never) => void)[];
        };
        _thisSubscribers: ((value: any, key: never) => void)[];
        _parentListener: (() => void) | null;
        _onChange(listener: (value: any, key: never) => void): () => void;
        _removeListeners: ((o: {}) => void)[];
        _onRemove(listener: (o: {}) => void): () => ((o: {}) => void)[];
        _onRemoveInternal(listener: (o: {}) => void): () => ((o: {}) => void)[];
        _beforeRemoveListeners: ((o: {}) => void)[];
        _onBeforeRemove(listener: (o: {}) => void): () => void;
        _setProps(props: import("./prop").PropSpec): void;
        _getRootState(): import("./RootState").RootState<unknown>;
        _rootStateAccess(path: string[]): any;
        _logger(): import("./RootState").Logger | null;
        _subscribeSelector<R>(selector: (t: any) => R, compute: (selected: R) => void, initCall?: boolean): void;
        _subscribe(listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
        _subscribeKey<K extends never>(key: K, listener: (value: K extends never ? {}[K] : never, updatedKey: never) => void, initCall?: boolean): () => void;
        _path(): string;
        _subscribeKeys(keys: never[], listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
        _get<P extends never>(prop: P): P extends never ? {}[P] : never;
        _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
        _notifySubscribers<P_1 extends never>(propOrId: P_1, value: P_1 extends never ? {}[P_1] : never): void;
        _notifyThisSubscribers(): void;
        _parentDispose: (() => void) | null;
        _children: any[];
        _registerChild<P_2 extends never>(propOrId: P_2, child: P_2 extends never ? {}[P_2] : never): void;
        _traverse(fun: (node: any) => void): void;
    };
} & ObjectConstructor;
export declare class StateArray<T> extends StateArray_base {
    _wrapped: T[];
    _isStateArray: boolean;
    constructor();
    get length(): number;
    set length(l: number);
    [index: number]: T;
    get(i: number): T;
    [Symbol.iterator](): IterableIterator<T>;
    forEach(f: (elt: T, idx: number, array: T[]) => void): void;
    map<R>(f: (elt: T, idx: number, array: T[]) => R): R[];
    findIndex(f: (elt: T) => boolean): number;
    push(...elements: T[]): number;
    _internalSet(index: number, val: T): void;
    remove(index: number): void;
    pop(): T | undefined;
    clear(): void;
    copy(other: T[]): void;
}
export declare class StateObjectArray<T> extends StateArray<T> {
    _isStateObjectArray: boolean;
    push(...elements: T[]): number;
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
export {};
