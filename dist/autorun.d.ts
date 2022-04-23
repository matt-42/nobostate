import { StateBaseInterface } from "./StateBase";
declare type AutorunFunction = (() => void) | (() => () => void);
declare type AccessInfo = {
    state: StateBaseInterface<any>;
    key: string | null;
};
export declare function autorunIgnore<R>(f: () => R): R;
declare class AccessInfoMap<V> {
    map: Map<StateBaseInterface<any>, Map<string | null, V>>;
    get size(): number;
    has(info: AccessInfo): boolean;
    clear(): void;
    get(info: AccessInfo): V | undefined;
    set(info: AccessInfo, val: V): this | undefined;
    delete(info: AccessInfo): this;
    forall(f: (pair: [AccessInfo, V]) => void): void;
}
interface AutorunContext {
    accesses: AccessInfoMap<boolean>;
    disposers: AccessInfoMap<() => void>;
    ignoreAccesses: boolean;
}
export declare let currentAutorunContext: AutorunContext | null;
declare type AutorunParams = {
    track: AutorunFunction;
    react: () => void;
};
export declare function autorun(f: AutorunParams, name?: string): () => void;
export declare function autorun(trackAndReact: AutorunFunction, name?: string): () => void;
export declare class Reaction {
    ctx: AutorunContext;
    disposed: boolean;
    reactionCallback: () => void;
    constructor(reactionCallback: () => void);
    printDependencies(): void;
    dispose(): void;
    name: string;
    track<R>(trackedFunction: () => R, name?: string): R | undefined;
}
export {};
