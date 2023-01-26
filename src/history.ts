import _ from "lodash";
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
  target: StateArray<any>;// | StateObjectArray<any>;
  element: any;
}
export interface HistoryAnyAction {
  action: "anyAction";
  propId: PropSpec;
  target: any;
  undo: () => void;
  redo: () => void;
}

type HistoryAction = HistoryUpdatePropAction | HistoryArrayAction | HistoryTableAction | HistoryAnyAction;

interface HistoryGroup {
  groupId: string | null;
  actions: HistoryAction[];
}

export class NoboHistory {

  history: HistoryGroup[] = [];
  currentHistoryIndex = -1;
  grouping = 0; // more than 0 when grouping.
  notRecording = 0;
  rootState: RootState<any>;

  constructor(root: RootState<any>) {
    this.rootState = root;
  }

  startGroup(groupId: string | null = null) {

    // Create a new group only if:
    if (!this.grouping && // we are not already in a group
      !this.notRecording && // history recording is active
      // and groupId is null or if it is different from the last history group.
      (groupId === null || _.last(this.history)?.groupId !== groupId)
    ) {
      // console.log("new group,", _.last(this.history)?.groupId, groupId)
      this.history.push({ groupId, actions: [] });
      this.currentHistoryIndex++;
      // console.log(_.last(this.history)?.groupId);
    }

    this.grouping++;

  }
  endGroup() {
    this.grouping--;
    if (this.grouping < 0) throw new Error();

    // If we are ending of an empty history group, remove it. 
    if (this.grouping === 0 && _.last(this.history)?.actions.length === 0) {
      if (this.currentHistoryIndex === this.history.length - 1)
        this.currentHistoryIndex--;

      let empty = this.history.pop();

      if (empty?.actions.length)
        throw new Error();
    }
  }

  ignore<R>(f: () => R): R {
    this.notRecording++;
    try {
      return f();
    } finally {
      this.notRecording--;
    }
  }

  async asyncIgnore<R>(f: () => Promise<R>): Promise<R> {
    this.notRecording++;
    try {
      const res = await f();
      this.notRecording--;
      return res;
    } catch(e) {
      this.notRecording--;
      throw e;
    }
  }

  group<R>(f: () => R): R;
  group<R>(groupId: string, f: () => R): R;
  group<R>(groupId_: string | (() => R), f_?: () => R): R {
    // if the last group has not the same merge id,
    // create a new group.
    // console.log(this.history.map(i => i.groupId));

    let f = f_ || groupId_ as () => R;
    let groupId = f_ ? (groupId_ as string) : null;

    // if (!this.grouping && !this.notRecording && (groupId === null || _.last(this.history)?.groupId !== groupId)) {
    //   // console.log("new group,", _.last(this.history)?.groupId, groupId)
    //   this.history.push({ groupId, actions: [] });
    //   this.currentHistoryIndex++;
    //   // console.log(_.last(this.history)?.groupId);
    // }
    // else 
    // console.log("no new group,", _.last(this.history)?.groupId, groupId)

    // console.log(this.history.map(i => i.groupId));

    this.startGroup(groupId);
    try {
      return f();
    } finally {
      this.endGroup();
    }
  }

  size() { return this.history.length; }

  push(item: HistoryAction) {
    // console.log(" PUSH ", item.action, item.target._path(), item.prop);

    if (this.notRecording) return;
    // Ignore some props.
    if (item.propId._undoIgnore)
      return;

    // erase future if any.
    // console.log("resize history to ", this.currentHistoryIndex + 1);
    this.history.length = this.currentHistoryIndex + 1;
    // console.log("history size after resize", this.history.length);

    // if last group contains the same updateProp action.
    // and if this group contains just 1 action.
    if (item.action === "updateProp" && _.last(this.history)?.actions.length === 1) {
      let last = _.last(this.history);
      let sameUpdateInLast = last?.actions.find(e => e.action === "updateProp" && e.target === item.target && e.propId === item.propId) as HistoryUpdatePropAction;
      if (sameUpdateInLast) {
        // the last group also updated item.prop, so we group the updates:
        sameUpdateInLast.next = item.next;
        return;
      }
    }

    // if we are grouping, append the action to the group.
    // node: "updateProp" actions are already grouped just above.
    if (this.grouping && _.last(this.history)) {
      _.last(this.history)?.actions.push(item);
      return;
    }

    // console.log("PUSH NULL");
    // if item is not grouped, push a new item.
    this.history.push({ groupId: null, actions: [item] });
    this.currentHistoryIndex += 1;
  }

  private undoAction(item: HistoryAction) {
    // this.rootState._loggerObject?.log("Undo");
    // this.rootState._loggerObject?.log(item);

    if (item.action === "anyAction")
      item.undo();
    else if (item.action === "updateProp") {
      // console.log("UNDO: ", item.target, item.prop, item.target[item.prop], item.next);
      // if (!_.isEqual(item.target[item.prop], item.next))
      //   throw new Error();
      item.target[item.prop] = item.prev;
    }
    else if (item.action === "remove") {
      // console.log("UNDO remove: ", item.element.id);
      item.target.insert(item.element);
    }
    else if (item.action === "insert")
      item.target.remove(item.element.id);
    else if (item.action === "push")
      (item.target as any as Array<any>).pop();
  }

  private redoAction(item: HistoryAction) {
    if (item.action === "anyAction")
      item.redo();
    // console.log("redo ", item);
    else if (item.action === "updateProp") {
      // if (!_.isEqual(item.target[item.prop], item.prev))
      //   throw new Error(`Redo Error: current value of ${item.target._props?._path?.join("/")}/${item.prop} should be ${item.prev} but it is ${item.target[item.prop]}`);
      item.target[item.prop] = item.next;
    }
    else if (item.action === "remove")
      item.target.remove(item.element.id);
    else if (item.action === "insert")
      item.target.insert(item.element);
    else if (item.action === "push")
      item.target.push(item.element);

  }

  undo() {
    // console.log("START UNDO.");
    this.rootState._transaction(() => {
      this.ignore(() => {

        let group = this.history[this.currentHistoryIndex];
        if (!group) {
          // console.log(`Undo: Nothing to undo. ${this.history.length}`);
          return;
        }
        // console.log(`Undo a group of ${group.actions.length} actions`);
        for (let i = group.actions.length - 1; i >= 0; i--)
          this.undoAction(group.actions[i]);
        this.currentHistoryIndex -= 1;
      });
      // console.log(this.rootState.robots?.get(1)?.frame?.ref);
      // console.log("END UNDO.");
    });
  }

  redo() {
    this.rootState._transaction(() => {
      this.ignore(() => {
        let group = this.history[this.currentHistoryIndex + 1];
        if (!group) return;
        group.actions.forEach(item => this.redoAction(item));
        this.currentHistoryIndex += 1;
      });
    });
  }

  goto(index: number) {
    if (index < this.currentHistoryIndex)
      while (index != this.currentHistoryIndex) {
        this.undo();
      }
    else
      while (index != this.currentHistoryIndex) {
        this.redo();
      }

  }

}

// Fake History, just execute everything without remembering anything.
export class DummyHistory {

  startGroup(groupId: string | null = null) {}

  endGroup() {}

  ignore<R>(f: () => R): R {
    return  f();
  }

  async asyncIgnore<R>(f: () => Promise<R>): Promise<R> {
    return f();
  }
  group<R>(f: () => R): R;
  group<R>(groupId: string, f: () => R): R;
  group<R>(groupId_: string | (() => R), f_?: () => R): R {

    let f = f_ || groupId_ as () => R;
    let groupId = f_ ? (groupId_ as string) : null;

    return f();
  }

  push(item: HistoryAction) {}
  redo() {}
  goto(index: number) {}
};