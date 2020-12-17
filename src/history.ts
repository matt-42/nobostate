import _ from "lodash";
import { StateArray } from "./StateArray";
import { PropSpec } from "./prop";
import { HasId, StateTable } from "./StateTable";

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
  mergeId: string | null;
  actions: HistoryAction[];
}

export class NoboHistory {

  history: HistoryGroup[] = [];
  currentHistoryIndex = -1;
  grouping = 0; // more than 0 when grouping.
  notRecording = 0;

  startGroup() { this.grouping++; }
  endGroup() { this.grouping--; if (this.grouping < 0) throw new Error(); }

  ignore(f: () => void) {
    this.notRecording++;
    try {
      f();
    } finally {
      this.notRecording--;
    }
  }

  group<R>(f: () => R): R;
  group<R>(mergeId: string, f : () => R): R;
  group<R>(mergeId_: string|(() => R), f_?: () => R): R {
    // if the last group has not the same merge id,
    // create a new group.
    // console.log(this.history.map(i => i.mergeId));

    let f = f_ || mergeId_ as () => R;
    let mergeId = f_ ? (mergeId_ as string) : null;

    if (!this.grouping && !this.notRecording && (mergeId === null || _.last(this.history)?.mergeId !== mergeId)) {
      // console.log("new group,", _.last(this.history)?.mergeId, mergeId)
      this.history.push({ mergeId, actions: [] });
      this.currentHistoryIndex++;
      // console.log(_.last(this.history)?.mergeId);
    }
    // else 
    // console.log("no new group,", _.last(this.history)?.mergeId, mergeId)

    // console.log(this.history.map(i => i.mergeId));

    this.startGroup();
    try {
      return f();
    } finally {
      this.endGroup();
    }
  }

  size() { return this.history.length; }

  push(item: HistoryAction) {
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
    this.history.push({ mergeId: null, actions: [item] });
    this.currentHistoryIndex += 1;
  }

  private undoAction(item: HistoryAction) {
    if (item.action === "anyAction")
      item.undo();
    else if (item.action === "updateProp") {
      // console.log(item.target, item.prop, item.target[item.prop], item.next);
      if (!_.isEqual(item.target[item.prop], item.next))
        throw new Error();
      item.target[item.prop] = item.prev;
    }
    else if (item.action === "remove")
      item.target.insert(item.element);
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
      if (!_.isEqual(item.target[item.prop], item.prev))
        throw new Error();
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
    this.ignore(() => {
      let group = this.history[this.currentHistoryIndex];
      if (!group) return;
      for (let i = group.actions.length - 1; i >= 0; i--)
        this.undoAction(group.actions[i]);
      this.currentHistoryIndex -= 1;
    })
  }

  redo() {
    this.ignore(() => {
      let group = this.history[this.currentHistoryIndex + 1];
      if (!group) return;
      group.actions.forEach(item => this.redoAction(item));
      this.currentHistoryIndex += 1;
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
