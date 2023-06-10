import { PropSpec, ReferenceSpec } from "./prop";
import { StateBaseInterface } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";
export declare function stateReferenceNotNullMixin<T extends HasId<any>>(): {
    new (idOrObj?: T | StateObject<T> | IdType<T> | null): {
        _isStateReferenceNotNull: boolean;
        readonly ref: StateObject<T>;
        set(idOrNewObj: IdType<T> | T | StateObject<T>): void;
        _isStateReference: boolean;
        _ref: StateObject<T> | null;
        _disposeRefOnDelete: (() => void) | null;
        _disposeRefOnChange: (() => void) | null;
        _disposeBackReference: (() => void) | null;
        _toInitialize: T | IdType<T> | null;
        _previousSetArgument: T | IdType<T> | null;
        _refListeners: ((ref: any) => void)[];
        _setProps(props: PropSpec): void;
        _disposeReference(): void;
        _specs(): ReferenceSpec<any, any>;
        _referencedTable(): StateTable<T>;
        _removeReferencedObject(obj: StateObject<T> | null): void;
        _subscribeRef(listener: (ref: any) => void, initCall?: boolean): () => void;
        _isStateBase: boolean;
        __removed__: boolean;
        _proxifiedThis: any | null;
        _parent: any;
        _props: PropSpec & {
            _ref: import("./prop").TablePropSpec<T>;
            _onRefDeleted: "set-null" | "cascade" | ((target: any, removeElement: any) => void);
            _own: boolean;
        } & {
            _: never;
        } & { [K in keyof T]: import("./prop").StatePropIdentifiers2<T[K], StateObject<T>>; };
        _subscribers: {
            [K: string]: ((value: any, key: "__stateReference__") => void)[];
        };
        _thisSubscribers: ((value: any, key: "__stateReference__") => void)[];
        _parentListener: (() => void) | null;
        _onChange(listener: (value: any, key: "__stateReference__") => void): () => void;
        _removeListeners: ((o: {
            __stateReference__: T;
        }) => void)[];
        _onRemove(listener: (o: {
            __stateReference__: T;
        }) => void): () => ((o: {
            __stateReference__: T;
        }) => void)[];
        _onRemoveInternal(listener: (o: {
            __stateReference__: T;
        }) => void): () => ((o: {
            __stateReference__: T;
        }) => void)[];
        _beforeRemoveListeners: ((o: {
            __stateReference__: T;
        }) => void)[];
        _onBeforeRemove(listener: (o: {
            __stateReference__: T;
        }) => void): () => void;
        _dummyHistory: import("./history").DummyHistory;
        _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
        _getRootState(): import("./RootState").RootState<unknown>;
        _rootStateAccess(path: string[]): any;
        _logger(): import("./RootState").Logger | null;
        _subscribeSelector<R>(selector: (t: any) => R, compute: (selected: R) => void, initCall?: boolean): void;
        _subscribe(listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
        _subscribeKey<K_1 extends "__stateReference__">(key: K_1, listener: (value: K_1 extends "__stateReference__" ? {
            __stateReference__: T;
        }[K_1] : never, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
        _path(): string;
        _subscribeKeys(keys: "__stateReference__"[], listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
        _get<P extends "__stateReference__">(prop: P): P extends "__stateReference__" ? {
            __stateReference__: T;
        }[P] : never;
        _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
        _notifySubscribers<P_1 extends "__stateReference__">(propOrId: P_1, value: P_1 extends "__stateReference__" ? {
            __stateReference__: T;
        }[P_1] : never): void;
        _notifyThisSubscribers(): void;
        _parentDispose: (() => void) | null;
        _children: Map<string, {
            _isStateBase: boolean;
            __removed__: boolean;
            _proxifiedThis: any | null;
            _parent: any;
            _props: PropSpec & {
                _ref: import("./prop").TablePropSpec<T>;
                _onRefDeleted: "set-null" | "cascade" | ((target: any, removeElement: any) => void);
                _own: boolean;
            } & {
                _: never;
            } & { [K in keyof T]: import("./prop").StatePropIdentifiers2<T[K], StateObject<T>>; };
            _subscribers: {
                [K: string]: ((value: any, key: "__stateReference__") => void)[];
            };
            _thisSubscribers: ((value: any, key: "__stateReference__") => void)[];
            _parentListener: (() => void) | null;
            _onChange(listener: (value: any, key: "__stateReference__") => void): () => void;
            _removeListeners: ((o: {
                __stateReference__: T;
            }) => void)[];
            _onRemove(listener: (o: {
                __stateReference__: T;
            }) => void): () => ((o: {
                __stateReference__: T;
            }) => void)[];
            _onRemoveInternal(listener: (o: {
                __stateReference__: T;
            }) => void): () => ((o: {
                __stateReference__: T;
            }) => void)[];
            _beforeRemoveListeners: ((o: {
                __stateReference__: T;
            }) => void)[];
            _onBeforeRemove(listener: (o: {
                __stateReference__: T;
            }) => void): () => void;
            _setProps(props: PropSpec): void;
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _subscribeKey<K_2 extends "__stateReference__">(key: K_2, listener: (value: K_2 extends "__stateReference__" ? {
                __stateReference__: T;
            }[K_2] : never, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: "__stateReference__"[], listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _get<P_2 extends "__stateReference__">(prop: P_2): P_2 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_2] : never;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends "__stateReference__">(propOrId: P_3, value: P_3 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_3] : never): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends "__stateReference__">(propOrId: P_4, child: P_4 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_4] : never): void;
            _traverse(fun: (node: any) => void): void;
        }>;
        _registerChild<P_5 extends "__stateReference__">(propOrId: P_5, child: P_5 extends "__stateReference__" ? {
            __stateReference__: T;
        }[P_5] : never): void;
        _traverse(fun: (node: {
            _isStateBase: boolean;
            __removed__: boolean;
            _proxifiedThis: any | null;
            _parent: any;
            _props: PropSpec & {
                _ref: import("./prop").TablePropSpec<T>;
                _onRefDeleted: "set-null" | "cascade" | ((target: any, removeElement: any) => void);
                _own: boolean;
            } & {
                _: never;
            } & { [K in keyof T]: import("./prop").StatePropIdentifiers2<T[K], StateObject<T>>; };
            _subscribers: {
                [K: string]: ((value: any, key: "__stateReference__") => void)[];
            };
            _thisSubscribers: ((value: any, key: "__stateReference__") => void)[];
            _parentListener: (() => void) | null;
            _onChange(listener: (value: any, key: "__stateReference__") => void): () => void;
            _removeListeners: ((o: {
                __stateReference__: T;
            }) => void)[];
            _onRemove(listener: (o: {
                __stateReference__: T;
            }) => void): () => ((o: {
                __stateReference__: T;
            }) => void)[];
            _onRemoveInternal(listener: (o: {
                __stateReference__: T;
            }) => void): () => ((o: {
                __stateReference__: T;
            }) => void)[];
            _beforeRemoveListeners: ((o: {
                __stateReference__: T;
            }) => void)[];
            _onBeforeRemove(listener: (o: {
                __stateReference__: T;
            }) => void): () => void;
            _setProps(props: PropSpec): void;
            _dummyHistory: import("./history").DummyHistory;
            _getRootStateHistory(): import("./history").NoboHistory | import("./history").DummyHistory;
            _getRootState(): import("./RootState").RootState<unknown>;
            _rootStateAccess(path: string[]): any;
            _logger(): import("./RootState").Logger | null;
            _subscribeSelector<R_1>(selector: (t: any) => R_1, compute: (selected: R_1) => void, initCall?: boolean): void;
            _subscribe(listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _subscribeKey<K_2 extends "__stateReference__">(key: K_2, listener: (value: K_2 extends "__stateReference__" ? {
                __stateReference__: T;
            }[K_2] : never, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _path(): string;
            _subscribeKeys(keys: "__stateReference__"[], listener: (value: any, updatedKey: "__stateReference__") => void, initCall?: boolean): () => void;
            _get<P_2 extends "__stateReference__">(prop: P_2): P_2 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_2] : never;
            _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
            _notifySubscribers<P_3 extends "__stateReference__">(propOrId: P_3, value: P_3 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_3] : never): void;
            _notifyThisSubscribers(): void;
            _parentDispose: (() => void) | null;
            _children: Map<string, any>;
            _registerChild<P_4 extends "__stateReference__">(propOrId: P_4, child: P_4 extends "__stateReference__" ? {
                __stateReference__: T;
            }[P_4] : never): void;
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
export declare type StateReference<T> = StateBaseInterface<T> & {
    _isStateReference: boolean;
    _toInitialize: IdType<T> | T | null;
    _subscribeRef(listener: (ref: StateReference<T>) => void, initCall?: boolean): () => void;
    set(idOrNewObj: IdType<T> | StateObject<T> | T | null, notify?: boolean): void;
    ref: StateObject<T> | null;
};
export declare type StateReferenceNotNull<T> = StateReference<T> & {
    _isStateReferenceNotNull: boolean;
    set(idOrNewObj: IdType<T> | StateObject<T> | T, notify?: boolean): void;
    ref: StateObject<T>;
};
export declare function stateReference<T extends HasId<any>>(id: IdType<T> | T | StateObject<T> | null): StateReference<T>;
export declare function stateReferenceNotNull<T extends HasId<any>>(id: IdType<T> | T | StateObject<T>): StateReferenceNotNull<T>;
export declare function nullStateReference(): StateReference<any>;
