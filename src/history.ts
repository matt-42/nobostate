import _ from "lodash";

interface HistoryItem {
  target: any;
  prop: string;
  propId: any;
  prev: any;
  next: any;
}

export class NoboHistory {


  history: HistoryItem[] = [];
  currentHistoryIndex = -1;

  push(item: HistoryItem) {
    // erase future.
    undoHistory.length = currentHistoryIndex + 1;
    // push item.
    undoHistory.push(item);
    currentHistoryIndex += 1;
  }

  undo(item: HistoryItem) {
    if (!_.isEqual(item.target[item.prop], item.next))
      throw new Error();
    item.target[item.prop] = item.prev;
  }
  redo(item: HistoryItem) {
    if (!_.isEqual(item.target[item.prop], item.prev))
      throw new Error();
    item.target[item.prop] = item.next;
  }

  goto(index: number) {
    if (index < currentHistoryIndex)
      while (index != currentHistoryIndex) {
        undo(undoHistory[currentHistoryIndex]);
        currentHistoryIndex--;
      }
    else
      while (index != currentHistoryIndex) {
        currentHistoryIndex++;
        redo(undoHistory[currentHistoryIndex]);
      }

  }

}
