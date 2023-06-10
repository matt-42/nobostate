import { ReferenceSpec, PropSpec } from "./prop";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";
declare const StateReferenceArray_base: {
    new (...args: any[]): {
        _isStateBase: boolean;
        __removed__: boolean;
        _proxifiedThis: any | null;
        _parent: any;
        _props: PropSpec & {};
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
        _setProps(props: PropSpec): void;
        _dummyHistory: import("./history").DummyHistory;
        _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
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
        _children: Map<string, any>;
        _registerChild<P_2 extends never>(propOrId: P_2, child: P_2 extends never ? {}[P_2] : never): void;
        _traverse(fun: (node: any) => void): void;
    };
} & ObjectConstructor;
export declare class StateReferenceArray<T extends HasId<any>> extends StateReferenceArray_base {
    _wrapped: StateObject<T>[];
    _isStateReferenceArray: boolean;
    _toInitialize: (IdType<T> | T)[];
    _refDisposers: Map<IdType<T>, (() => void)[]>;
    constructor(array?: (IdType<T> | T)[]);
    get length(): number;
    set length(l: number);
    [index: number]: StateObject<T>;
    get(i: number): StateObject<T>;
    [Symbol.iterator](): IterableIterator<StateObject<T>>;
    forEach(f: (elt: StateObject<T>, idx: number, array: StateObject<T>[]) => void): void;
    map<R>(f: (elt: StateObject<T>, idx: number, array: StateObject<T>[]) => R): R[];
    findIndex(f: (elt: StateObject<T>) => boolean): number;
    _specs(): ReferenceSpec<any, any>;
    _referencedTable(): StateTable<T>;
    _setProps(props: PropSpec): void;
    clear(): void;
    disposeRemovedElement(o: StateObject<T>): void;
    registerNewElement(ref: StateObject<T>): void;
    remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[];
    _internalSet(index: number, obj: StateObject<T>): void;
    insert(elt: IdType<T> | T | StateObject<T>, index: number): void;
    push(...elements: (IdType<T> | T | StateObject<T>)[]): number;
    pop(): StateObject<T> | undefined;
}
export declare function stateReferenceArray<T extends HasId<any>>(elts?: (T | IdType<T>)[]): StateReferenceArray<T>;
export {};
