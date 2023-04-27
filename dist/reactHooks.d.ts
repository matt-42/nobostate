/// <reference types="react" />
import { RootState } from "./RootState";
import { StateArray, StateObjectArray } from "./StateArray";
import { Keys } from "./StateBase";
import { StateObject } from "./StateObject";
import { StateReference, StateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { HasId, IdType, StateTable } from "./StateTable";
export declare function useNoboState<T>(state: T): T;
export declare function useMounted(): {
    current: boolean;
};
export declare function useRefreshThisComponent(): () => void;
export declare function useNoboStateImpl(state: any, prop?: any): any;
declare type ExtractKeys<T> = T extends StateTable<infer B> ? IdType<B> : T extends StateObject<infer B> ? keyof B : T extends RootState<infer B> ? keyof B : T extends StateObjectArray<infer B> ? number : T extends StateArray<infer B> ? number : T extends StateReference<infer B> ? never : T extends StateReferenceNotNull<infer B> ? never : T extends StateReferenceArray<infer B> ? number : never;
declare type KeyAccessType2<T, K> = T extends StateTable<infer B> ? B : T extends StateObject<infer B> ? (K extends keyof B ? B[K] : never) : T extends RootState<infer B> ? (K extends keyof B ? B[K] : never) : T extends StateObjectArray<infer B> ? number : T extends StateArray<infer B> ? number : T extends StateReference<infer B> ? never : T extends StateReferenceNotNull<infer B> ? never : T extends StateReferenceArray<infer B> ? number : never;
export declare function useNoboKey<T, K extends ExtractKeys<T>>(state_: T, key: K): KeyAccessType2<T, K>;
export declare function useNoboKeys<T, K extends Array<ExtractKeys<T>>>(state_: T, keys: K): {
    [Key in keyof K]: KeyAccessType2<T, Key>;
};
/**
 * Refresh everytime selector return a different value.
 * Deep comparison (_.isEqual) is used to compare values.
 */
export declare function useNoboSelector<T, R>(state: StateObject<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T, R>(state: StateTable<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T, R>(state: StateArray<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T, R>(state: StateObjectArray<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T, R>(state: StateReference<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T extends HasId<any>, R>(state: StateReferenceArray<T>, selector: (o: typeof state) => R): R;
export declare function useNoboSelector<T, R>(state: StateReferenceNotNull<T>, selector: (o: typeof state) => R): R;
export declare function useNoboRef<T extends HasId<any>>(state: StateReference<T>): StateReference<T>;
export declare function useNoboRef<T extends HasId<any>>(state: StateReferenceNotNull<T>): StateReferenceNotNull<T>;
export declare function useNoboRefKey<T extends HasId<any>>(state: StateReference<T>, key: Keys<T>): any;
export declare function useNoboMapSelector<T extends HasId<any>, R>(table: StateTable<T>, mapSelector: (o: StateObject<T>) => R): R[];
export declare function useNoboIds<T extends HasId<any>>(table: StateTable<T>): IdType<T>[];
export declare function useNoboObserver<R>(f: () => R): R;
export declare function observer<P>(component: React.FunctionComponent<P>, name?: string): React.FunctionComponent<P>;
export declare function debouncedObserver<P>(component: React.FunctionComponent<P>, name?: string): React.FunctionComponent<P>;
export {};
