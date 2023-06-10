import { ReferenceSpec } from "./prop";
import { StateBaseInterface } from "./StateBase";
export declare function stateObjectMixin<T>(): {
    new (src: T): {
        _isStateObject: boolean;
        _backReferencesMap: {
            [p: number]: any;
        };
        _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void;
        _backReferences<Parent_1>(p: ReferenceSpec<any, Parent_1>): Parent_1[];
        _internalSet<K extends keyof T>(key: K, val: T[K]): void;
        _update(value: { [K_1 in keyof T]?: T[K_1] | undefined; }): void;
        _isStateBase: boolean;
        __removed__: boolean;
        _proxifiedThis: any | null;
        _parent: any;
        _props: import("./prop").StatePropIdentifiers<T>;
        _subscribers: {
            [K: string]: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
        };
        _thisSubscribers: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
        _parentListener: (() => void) | null;
        _onChange(listener: (value: any, key: import("./StateBase").Keys<T>) => void): () => void;
        _removeListeners: ((o: T) => void)[];
        _onRemove(listener: (o: T) => void): () => ((o: T) => void)[];
        _onRemoveInternal(listener: (o: T) => void): () => ((o: T) => void)[];
        _beforeRemoveListeners: ((o: T) => void)[];
        _onBeforeRemove(listener: (o: T) => void): () => void;
        _setProps(props: import("./prop").PropSpec): void;
        _dummyHistory: import("./history").DummyHistory;
        _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
        _getRootState(): import("./RootState").RootState<unknown>;
        _rootStateAccess(path: string[]): any;
        _logger(): import("./RootState").Logger | null;
        _subscribeSelector<R>(selector: (t: any) => R, compute: (selected: R) => void, initCall?: boolean): void;
        _subscribe(listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
        _subscribeKey<K_2 extends import("./StateBase").Keys<T>>(key: K_2, listener: (value: import("./StateBase").KeyAccessType<T, K_2>, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
        _path(): string;
        _subscribeKeys(keys: import("./StateBase").Keys<T>[], listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
        _get<P extends import("./StateBase").Keys<T>>(prop: P): import("./StateBase").KeyAccessType<T, P>;
        _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
        _notifySubscribers<P_1 extends import("./StateBase").Keys<T>>(propOrId: P_1, value: import("./StateBase").KeyAccessType<T, P_1>): void;
        _notifyThisSubscribers(): void;
        _parentDispose: (() => void) | null;
        _children: Map<string, {
            _isStateBase: boolean;
            __removed__: boolean;
            _proxifiedThis: any | null;
            _parent: any;
            _props: import("./prop").StatePropIdentifiers<T>;
            _subscribers: {
                [K: string]: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
            };
            _thisSubscribers: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
            _parentListener: (() => void) | null;
            _onChange(listener: (value: any, key: import("./StateBase").Keys<T>) => void): () => void;
            _removeListeners: ((o: T) => void)[];
            _onRemove(listener: (o: T) => void): () => ((o: T) => void)[];
            _onRemoveInternal(listener: (o: T) => void): () => ((o: T) => void)[];
            _beforeRemoveListeners: ((o: T) => void)[];
            _onBeforeRemove(listener: (o: T) => void): () => void;
            _setProps(props: import("./prop").PropSpec): void;
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _subscribeKey<K_3 extends import("./StateBase").Keys<T>>(key: K_3, listener: (value: import("./StateBase").KeyAccessType<T, K_3>, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: import("./StateBase").Keys<T>[], listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _get<P_2 extends import("./StateBase").Keys<T>>(prop: P_2): import("./StateBase").KeyAccessType<T, P_2>;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends import("./StateBase").Keys<T>>(propOrId: P_3, value: import("./StateBase").KeyAccessType<T, P_3>): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends import("./StateBase").Keys<T>>(propOrId: P_4, child: import("./StateBase").KeyAccessType<T, P_4>): void;
            _traverse(fun: (node: any) => void): void;
        }>;
        _registerChild<P_5 extends import("./StateBase").Keys<T>>(propOrId: P_5, child: import("./StateBase").KeyAccessType<T, P_5>): void;
        _traverse(fun: (node: {
            _isStateBase: boolean;
            __removed__: boolean;
            _proxifiedThis: any | null;
            _parent: any;
            _props: import("./prop").StatePropIdentifiers<T>;
            _subscribers: {
                [K: string]: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
            };
            _thisSubscribers: ((value: any, key: import("./StateBase").Keys<T>) => void)[];
            _parentListener: (() => void) | null;
            _onChange(listener: (value: any, key: import("./StateBase").Keys<T>) => void): () => void;
            _removeListeners: ((o: T) => void)[];
            _onRemove(listener: (o: T) => void): () => ((o: T) => void)[];
            _onRemoveInternal(listener: (o: T) => void): () => ((o: T) => void)[];
            _beforeRemoveListeners: ((o: T) => void)[];
            _onBeforeRemove(listener: (o: T) => void): () => void;
            _setProps(props: import("./prop").PropSpec): void;
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _subscribeKey<K_3 extends import("./StateBase").Keys<T>>(key: K_3, listener: (value: import("./StateBase").KeyAccessType<T, K_3>, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: import("./StateBase").Keys<T>[], listener: (value: any, updatedKey: import("./StateBase").Keys<T>) => void, initCall?: boolean): () => void;
            _get<P_2 extends import("./StateBase").Keys<T>>(prop: P_2): import("./StateBase").KeyAccessType<T, P_2>;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends import("./StateBase").Keys<T>>(propOrId: P_3, value: import("./StateBase").KeyAccessType<T, P_3>): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends import("./StateBase").Keys<T>>(propOrId: P_4, child: import("./StateBase").KeyAccessType<T, P_4>): void;
            _traverse(fun: any): void;
        }) => void): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: string | number | symbol): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: string | number | symbol): boolean;
    };
    getPrototypeOf(o: any): any;
    getOwnPropertyDescriptor(o: any, p: string | number | symbol): PropertyDescriptor | undefined;
    getOwnPropertyNames(o: any): string[];
    create(o: object | null): any;
    create(o: object | null, properties: PropertyDescriptorMap & ThisType<any>): any;
    defineProperty(o: any, p: string | number | symbol, attributes: PropertyDescriptor & ThisType<any>): any;
    defineProperties(o: any, properties: PropertyDescriptorMap & ThisType<any>): any;
    seal<T_1>(o: T_1): T_1;
    freeze<T_2>(a: T_2[]): readonly T_2[];
    freeze<T_3 extends Function>(f: T_3): T_3;
    freeze<T_4>(o: T_4): Readonly<T_4>;
    preventExtensions<T_5>(o: T_5): T_5;
    isSealed(o: any): boolean;
    isFrozen(o: any): boolean;
    isExtensible(o: any): boolean;
    keys(o: object): string[];
    keys(o: {}): string[];
    assign<T_6, U>(target: T_6, source: U): T_6 & U;
    assign<T_7, U_1, V>(target: T_7, source1: U_1, source2: V): T_7 & U_1 & V;
    assign<T_8, U_2, V_1, W>(target: T_8, source1: U_2, source2: V_1, source3: W): T_8 & U_2 & V_1 & W;
    assign(target: object, ...sources: any[]): any;
    getOwnPropertySymbols(o: any): symbol[];
    is(value1: any, value2: any): boolean;
    setPrototypeOf(o: any, proto: object | null): any;
    values<T_9>(o: {
        [s: string]: T_9;
    } | ArrayLike<T_9>): T_9[];
    values(o: {}): any[];
    entries<T_10>(o: {
        [s: string]: T_10;
    } | ArrayLike<T_10>): [string, T_10][];
    entries(o: {}): [string, any][];
    getOwnPropertyDescriptors<T_11>(o: T_11): { [P_6 in keyof T_11]: TypedPropertyDescriptor<T_11[P_6]>; } & {
        [x: string]: PropertyDescriptor;
    };
    fromEntries<T_12 = any>(entries: Iterable<readonly [string | number | symbol, T_12]>): {
        [k: string]: T_12;
    };
    fromEntries(entries: Iterable<readonly any[]>): any;
};
declare const AnyStateObject_base: {
    new (src: {}): {
        _isStateObject: boolean;
        _backReferencesMap: {
            [p: number]: any;
        };
        _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void;
        _backReferences<Parent_1>(p: ReferenceSpec<any, Parent_1>): Parent_1[];
        _internalSet<K extends never>(key: K, val: {}[K]): void;
        _update(value: {}): void;
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
        _dummyHistory: import("./history").DummyHistory;
        _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
        _getRootState(): import("./RootState").RootState<unknown>;
        _rootStateAccess(path: string[]): any;
        _logger(): import("./RootState").Logger | null;
        _subscribeSelector<R>(selector: (t: any) => R, compute: (selected: R) => void, initCall?: boolean): void;
        _subscribe(listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
        _subscribeKey<K_1 extends never>(key: K_1, listener: (value: K_1 extends never ? {}[K_1] : never, updatedKey: never) => void, initCall?: boolean): () => void;
        _path(): string;
        _subscribeKeys(keys: never[], listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
        _get<P extends never>(prop: P): P extends never ? {}[P] : never;
        _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
        _notifySubscribers<P_1 extends never>(propOrId: P_1, value: P_1 extends never ? {}[P_1] : never): void;
        _notifyThisSubscribers(): void;
        _parentDispose: (() => void) | null;
        _children: Map<string, {
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
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
            _subscribeKey<K_2 extends never>(key: K_2, listener: (value: K_2 extends never ? {}[K_2] : never, updatedKey: never) => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: never[], listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
            _get<P_2 extends never>(prop: P_2): P_2 extends never ? {}[P_2] : never;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends never>(propOrId: P_3, value: P_3 extends never ? {}[P_3] : never): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends never>(propOrId: P_4, child: P_4 extends never ? {}[P_4] : never): void;
            _traverse(fun: (node: any) => void): void;
        }>;
        _registerChild<P_5 extends never>(propOrId: P_5, child: P_5 extends never ? {}[P_5] : never): void;
        _traverse(fun: (node: {
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
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
            _subscribeKey<K_2 extends never>(key: K_2, listener: (value: K_2 extends never ? {}[K_2] : never, updatedKey: never) => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: never[], listener: (value: any, updatedKey: never) => void, initCall?: boolean): () => void;
            _get<P_2 extends never>(prop: P_2): P_2 extends never ? {}[P_2] : never;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends never>(propOrId: P_3, value: P_3 extends never ? {}[P_3] : never): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends never>(propOrId: P_4, child: P_4 extends never ? {}[P_4] : never): void;
            _traverse(fun: any): void;
        }) => void): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: string | number | symbol): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: string | number | symbol): boolean;
    };
    getPrototypeOf(o: any): any;
    getOwnPropertyDescriptor(o: any, p: string | number | symbol): PropertyDescriptor | undefined;
    getOwnPropertyNames(o: any): string[];
    create(o: object | null): any;
    create(o: object | null, properties: PropertyDescriptorMap & ThisType<any>): any;
    defineProperty(o: any, p: string | number | symbol, attributes: PropertyDescriptor & ThisType<any>): any;
    defineProperties(o: any, properties: PropertyDescriptorMap & ThisType<any>): any;
    seal<T>(o: T): T;
    freeze<T_1>(a: T_1[]): readonly T_1[];
    freeze<T_2 extends Function>(f: T_2): T_2;
    freeze<T_3>(o: T_3): Readonly<T_3>;
    preventExtensions<T_4>(o: T_4): T_4;
    isSealed(o: any): boolean;
    isFrozen(o: any): boolean;
    isExtensible(o: any): boolean;
    keys(o: object): string[];
    keys(o: {}): string[];
    assign<T_5, U>(target: T_5, source: U): T_5 & U;
    assign<T_6, U_1, V>(target: T_6, source1: U_1, source2: V): T_6 & U_1 & V;
    assign<T_7, U_2, V_1, W>(target: T_7, source1: U_2, source2: V_1, source3: W): T_7 & U_2 & V_1 & W;
    assign(target: object, ...sources: any[]): any;
    getOwnPropertySymbols(o: any): symbol[];
    is(value1: any, value2: any): boolean;
    setPrototypeOf(o: any, proto: object | null): any;
    values<T_8>(o: {
        [s: string]: T_8;
    } | ArrayLike<T_8>): T_8[];
    values(o: {}): any[];
    entries<T_9>(o: {
        [s: string]: T_9;
    } | ArrayLike<T_9>): [string, T_9][];
    entries(o: {}): [string, any][];
    getOwnPropertyDescriptors<T_10>(o: T_10): { [P_6 in keyof T_10]: TypedPropertyDescriptor<T_10[P_6]>; } & {
        [x: string]: PropertyDescriptor;
    };
    fromEntries<T_11 = any>(entries: Iterable<readonly [string | number | symbol, T_11]>): {
        [k: string]: T_11;
    };
    fromEntries(entries: Iterable<readonly any[]>): any;
};
declare class AnyStateObject extends AnyStateObject_base {
}
export declare function anyStateObject(): AnyStateObject;
export interface StateObjectInterface<T> extends StateBaseInterface<T> {
    _isStateObject: boolean;
    _update(value: {
        [K in keyof T]?: T[K];
    }): void;
    _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void;
    _backReferences<Parent>(p: ReferenceSpec<any, Parent>): Parent[];
}
export declare type StateObject<T> = StateObjectInterface<T> & T;
export {};
