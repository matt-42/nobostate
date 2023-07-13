import { NoboHistory } from "./history";
import { PropSpec, StatePropIdentifiers } from "./prop";
import { RootState } from "./RootState";
export declare function callListeners(listeners: StateBaseInterface<any> | ((...args: any[]) => void)[], ...args: any[]): void;
export declare type ObjectPropsKeys<T> = {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export declare type KeyAccessType<T, P> = T extends (infer O)[] ? O : T extends Array<infer O> ? O : T extends Map<any, infer O> ? O : P extends keyof T ? T[P] : never;
export declare type Keys<T> = T extends Map<infer I, any> ? I : T extends Array<any> ? number : T extends any[] ? number : keyof T;
export declare type Constructor<T = {}> = new (...args: any[]) => T;
export declare function stateBaseMixin<T, Ctor extends Constructor>(wrapped: Ctor): {
    new (...args: any[]): {
        _isStateBase: boolean;
        __removed__: boolean;
        _proxifiedThis: any | null;
        _parent: any | null;
        _props: StatePropIdentifiers<T>;
        _subscribers: {
            [K: string]: ((value: any, key: Keys<T>) => void)[];
        };
        _thisSubscribers: ((value: any, key: Keys<T>) => void)[];
        _parentListener: (() => void) | null;
        _onChange(listener: (value: any, key: Keys<T>) => void): () => void;
        _removeListeners: ((o: T) => void)[];
        _onRemove(listener: (o: T) => void): () => ((o: T) => void)[];
        _onRemoveInternal(listener: (o: T) => void): () => ((o: T) => void)[];
        _beforeRemoveListeners: ((o: T) => void)[];
        _onBeforeRemove(listener: (o: T) => void): () => void;
        _setProps(props: PropSpec): void;
        _getRootStateHistory(): NoboHistory | null;
        _rootStateCache: RootState<unknown> | null;
        _getRootState(): RootState<unknown>;
        _rootStateAccess(path: string[]): any;
        _logger(): import("./log").Logger | null;
        _subscribeSelector<R>(selector: (t: any) => R, compute: (selected: R) => void, initCall?: boolean): void;
        _subscribe(listener: (value: any, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
        _subscribeKey<K extends Keys<T>>(key: K, listener: (value: KeyAccessType<T, K>, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
        _path(): string;
        _subscribeKeys(keys: Keys<T>[], listener: (value: any, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
        _get<P extends Keys<T>>(prop: P): KeyAccessType<T, P>;
        _runNotification(listeners: any | ((...args: any[]) => void)[], ...args: any[]): void;
        _notifySubscribers<P_2 extends Keys<T>>(propOrId: P_2, value: KeyAccessType<T, P_2>): void;
        _notifyThisSubscribers(): void;
        _parentDispose: (() => void) | null;
        _childrenMap: Map<string, any> | null;
        _children(): Map<string, any>;
        _registerChild<P_3 extends Keys<T>>(propOrId: P_3, child: KeyAccessType<T, P_3>): void;
        _traverse(fun: (node: any) => void): void;
    };
} & Ctor;
export interface StateBaseInterface<T> {
    _isStateBase: boolean;
    __removed__: boolean;
    _parent: any | null;
    _props: StatePropIdentifiers<T>;
    _subscribers: {
        [K: string]: ((value: any, key: Keys<T>) => void)[];
    };
    _thisSubscribers: ((value: any, key: Keys<T>) => void)[];
    _parentListener: (() => void) | null;
    _onChange(listener: ((value: this, key: Keys<T>) => void)): (() => void);
    _removeListeners: ((o: T) => void)[];
    _onRemove(listener: (o: T) => void): () => void;
    _onRemoveInternal(listener: (o: T) => void): () => void;
    _onBeforeRemove(listener: (o: T) => void): () => void;
    _path(): string;
    _setProps(props: PropSpec): void;
    _getRootState(): {
        _history: NoboHistory;
    };
    _rootStateAccess(path: string[]): any;
    _subscribeSelector<R>(selector: (t: this) => R, compute: (selected: R) => void, initCall?: boolean): void;
    _subscribe(listener: (value: this, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
    _subscribeKey<K extends Keys<T>>(key: K, listener: (value: KeyAccessType<T, K>, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
    _subscribeKeys(keys: Keys<T>[], listener: (value: this, updatedKey: Keys<T>) => void, initCall?: boolean): () => void;
    _get<P extends Keys<T>>(prop: P): KeyAccessType<T, P>;
    _notifySubscribers<P extends Keys<T>>(propOrId: P, value: KeyAccessType<T, P>): void;
    _children(): Map<string, StateBaseInterface<any>>;
    _registerChild<P extends Keys<T>>(propOrId: P, child: KeyAccessType<T, P>): void;
    _traverse(fun: (node: StateBaseInterface<any>) => void): void;
}
