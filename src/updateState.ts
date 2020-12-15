
/**
 * Update prop \prop of state dst with value src.
 * @param dst
 * @param prop
 * @param src
 */

import _ from "lodash";
import { copyStateArray, stateArrayMixin } from "./array";
import { HistoryUpdatePropAction } from "./history";
import { propagatePropIds } from "./prop";
import { stateObjectMixin } from "./StateObjectImpl";
import { StateTable, stateTableMixin } from "./StateTable";

export function updateState(dst: any, prop: any, src: any) {

  // console.log('udate state! ', dst, src);
  const isPrimitive = (o: any) => !(o?._isStateObject ||
    o?._isStateArray ||
    o?._isStateTable);

  let toUpdate = dst._get(prop);
  if (toUpdate?._isStateArray) {// || toUpdate instanceof StateObjectArrayImpl) {
    copyStateArray(toUpdate, src);
  }
  else if (toUpdate?._isStateObject) {
    let obj = toUpdate as any;
    for (let k in src) {
      if ((k as string).startsWith("_")) continue;

      if (isPrimitive(obj[k])) {
        // console.log("update ", k, " with ", src[k])
        obj[k] = src[k];
        obj._notifySubscribers(k, obj[k]);
      }

      else
        updateState(obj, k, src[k]);
    }
  }
  else if (toUpdate?._isStateTable) {
    let newKeys = src._stateTable.map((e: any) => e.id);
    let idsToRemove = _.difference([...toUpdate.ids()], newKeys);
    for (let id of idsToRemove)
      toUpdate.remove(id);
    for (let elt of src._stateTable)
      if ((toUpdate as StateTable<any>).has(elt.id))
        updateState(toUpdate, elt.id, elt);

      else
        toUpdate.insert(elt);
    // throw new Error("not implemented");
  }
  else { // dst[prop] is a non state value. Update it.
    let prev = dst[prop];

    if (prev === undefined && src?._isStateBase) {
      dst._registerChild(prop, src);
      if (dst._props)
        propagatePropIds(src, dst._props[prop]);
    }
    dst[prop] = src;
    dst._notifySubscribers(prop, src);

    // console.log(prop);
    // console.log(dst._getRootState());
    let history = dst._getRootState()._history;
    // console.log(history.push);
    // console.log(dst._propId);
    if (dst._props && history)
      history.push({
        action: "updateProp",
        target: dst,
        prop: prop,
        propId: dst._props[prop],
        prev,
        next: src
      } as HistoryUpdatePropAction);

  }
}
