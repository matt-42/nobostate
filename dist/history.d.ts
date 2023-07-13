import { StateArray } from "./StateArray";
import { PropSpec } from "./prop";
import { HasId, StateTable } from "./StateTable";
import { RootState } from "./RootState";
export interface HistoryUpdatePropAction {
    action: "updateProp";
    target: any;
    prop: string;
    propId: PropSpec;
    prev: any;
    next: any;
}
export interface HistoryTableAction {
    action: "insert" | "remove";
    propId: PropSpec;
    target: StateTable<any>;
    element: HasId<any>;
}
export interface HistoryArrayAction {
    action: "push";
    propId: PropSpec;
    target: StateArray<any>;
    element: any;
}
export interface HistoryAnyAction {
    action: "anyAction";
    propId: PropSpec;
    target: any;
    undo: () => void;
    redo: () => void;
}
declare type HistoryAction = HistoryUpdatePropAction | HistoryArrayAction | HistoryTableAction | HistoryAnyAction;
interface HistoryGroup {
    groupId: string | null;
    actions: HistoryAction[];
}
export declare class NoboHistory {
    history: HistoryGroup[];
    currentHistoryIndex: number;
    grouping: number;
    notRecording: number;
    rootState: RootState<any>;
    constructor(root: RootState<any>);
    startGroup(groupId?: string | null): void;
    endGroup(): void;
    ignore<R>(f: () => R): R;
    asyncIgnore<R>(f: () => Promise<R>): Promise<R>;
    group<R>(f: () => R): R;
    group<R>(groupId: string, f: () => R): R;
    size(): number;
    push(item: HistoryAction): void;
    private undoAction;
    private redoAction;
    undo(): void;
    redo(): void;
    goto(index: number): void;
}
export {};
