import _ from "lodash";
import { HasId, PropId, StateArray, StateArrayImpl, StateTable } from "./nobostate";

export interface HistoryUpdatePropAction {
  action: "updateProp";
  target: any;
  prop: string;
  propId: PropId;
  prev: any;
  next: any;
}

export interface HistoryTableAction {
  action: "insert" | "remove";
  propId: PropId;
  target: StateTable<any>;
  element: HasId<any>;
}

export interface HistoryArrayAction {
  action: "push";
  propId: PropId;
  target: StateArrayImpl<any>;
  element: any;
}

type HistoryAction = HistoryUpdatePropAction | HistoryArrayAction | HistoryTableAction;

class HistoryGroup {
  actions = [] as HistoryAction[];
}

export class NoboHistory {

  history: HistoryGroup[] = [];
  currentHistoryIndex = -1;
  ignorePropIds: PropId[]
  grouping = false;
  recording = true;

  constructor(ignorePropIds: PropId[]) {
    this.ignorePropIds = ignorePropIds;
  }

  startGroup() { this.grouping = true; }
  endGroup() { this.grouping = false; }
  groupActions(f: () => void) {
    this.startGroup();
    try {
      f();
    } finally {
      this.endGroup();
    }
  }

  size() { return history.length; }

  push(item: HistoryAction) {
    if (!this.recording) return;
    // Ignore some props.
    if (this.ignorePropIds.find(p => p === item.propId))
      return;

    // erase future if any.
    this.history.length = this.currentHistoryIndex + 1;

    // if last group contains the same updateProp action.
    if (item.action === "updateProp") {
      let last = _.last(this.history);
      let sameUpdateInLast = last?.actions.find(e => e.target === item.target && e.propId === item.propId) as HistoryUpdatePropAction;
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

    // if item is not grouped, push a new item.
    this.history.push({ actions: [item] });
    this.currentHistoryIndex += 1;
  }

  private undoAction(item: HistoryAction) {
    if (item.action === "updateProp") {
      // console.log(item.target, item.prop, item.target[item.prop], item.next);
      if (!_.isEqual(item.target[item.prop], item.next))
        throw new Error();
      item.target[item.prop] = item.prev;
    }
    if (item.action === "remove")
      item.target.insert(item.element);
    if (item.action === "insert")
      item.target.remove(item.element.id);
    if (item.action === "push")
      item.target.pop();
  }

  private redoAction(item: HistoryAction) {

    // console.log("redo ", item);
    if (item.action === "updateProp") {
      if (!_.isEqual(item.target[item.prop], item.prev))
        throw new Error();
      item.target[item.prop] = item.next;
    }
    if (item.action === "remove")
      item.target.remove(item.element.id);
    if (item.action === "insert")
      item.target.insert(item.element);
    if (item.action === "push")
      item.target.push(item.element);



  }

  undo() {
    this.recording = false;
    try {

      let group = this.history[this.currentHistoryIndex];
      if (!group) return;
      for (let i = group.actions.length - 1; i >= 0; i--)
        this.undoAction(group.actions[i]);
      this.currentHistoryIndex -= 1;
    } finally {
      this.recording = true;
    }
  }

  redo() {
    this.recording = false;
    try {
      let group = this.history[this.currentHistoryIndex + 1];
      if (!group) return;
      group.actions.forEach(item => this.redoAction(item));
      this.currentHistoryIndex += 1;
    } finally {
      this.recording = true;
    }
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
