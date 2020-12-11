import _ from "lodash";
import { HasId, PropId, StateArrayImpl, StateObjectArrayImpl, StateTableImpl } from "./nobostate";

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
  target: StateTableImpl<any>;
  element: HasId<any>;
}

export interface HistoryArrayAction {
  action: "push";
  propId: PropId;
  target: StateArrayImpl<any> | StateObjectArrayImpl<any>;
  element: any;
}

type HistoryAction = HistoryUpdatePropAction | HistoryArrayAction | HistoryTableAction;

interface HistoryGroup {
  mergeId: string | null;
  actions: HistoryAction[];
}

export class NoboHistory {

  history: HistoryGroup[] = [];
  currentHistoryIndex = -1;
  ignorePropIds: PropId[]
  grouping = 0; // more than 0 when grouping.
  recording = true;

  constructor(ignorePropIds: PropId[]) {
    this.ignorePropIds = ignorePropIds;
    // console.log("build history!");
  }

  startGroup() { this.grouping++; }
  endGroup() { this.grouping--; if (this.grouping < 0) throw new Error(); }
  group(mergeId: string, f: () => void) {
    // if the last group has not the same merge id,
    // create a new group.
    // console.log(this.history.map(i => i.mergeId));

    if (_.last(this.history)?.mergeId !== mergeId)
    {
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
      f();
    } finally {
      this.endGroup();
    }
  }

  size() { return this.history.length; }

  push(item: HistoryAction) {
    if (!this.recording) return;
    // Ignore some props.
    if (this.ignorePropIds.find(p => p === item.propId))
      return;

    // erase future if any.
    // console.log("resize history to ", this.currentHistoryIndex + 1);
    this.history.length = this.currentHistoryIndex + 1;
    // console.log("history size after resize", this.history.length);

    // if last group contains the same updateProp action.
    // and if this group contains just 1 action.
    if (item.action === "updateProp" && _.last(this.history)?.actions.length === 1) {
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

    // console.log("PUSH NULL");
    // if item is not grouped, push a new item.
    this.history.push({ mergeId: null, actions: [item] });
    this.currentHistoryIndex += 1;
  }

  private undoAction(item: HistoryAction) {
    if (item.action === "updateProp") {
      console.log(item.target, item.prop, item.target[item.prop], item.next);
      if (!_.isEqual(item.target[item.prop], item.next))
        throw new Error();
      item.target[item.prop] = item.prev;
    }
    if (item.action === "remove")
      item.target.insert(item.element);
    if (item.action === "insert")
      item.target.remove(item.element.id);
    if (item.action === "push")
      (item.target as any as Array<any>).pop();
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
