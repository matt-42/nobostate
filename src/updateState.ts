
/**
 * Update prop \prop of state dst with value src.
 * @param dst
 * @param prop
 * @param src
 */

import _ from "lodash";
import { autorunIgnore } from "./autorun";
import { HistoryUpdatePropAction } from "./history";
import { propagatePropIds } from "./prop";
import { copyStateArray, StateArray } from "./StateArray";
import { StateObject } from "./StateObject";
import { StateReference } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { StateTable } from "./StateTable";

export function updateState(dst: any, prop: any, src: any) {

  autorunIgnore(() => {

    // console.log('update state! ', prop, src, dst);
    const isPrimitive = (o: any) => !(o?._isStateObject ||
      o?._isStateArray ||
      o?._isStateTable);

    let toUpdate = dst._get(prop);

    //
    // References.
    //
    if (toUpdate?._isStateReference) {
      let srcRef = src as StateReference<any>;
      if (!srcRef._isStateReference) {
        console.log(toUpdate);
        console.log(src);
        throw new Error(`UpdateState type error when updating reference ${dst._path()}/${prop}`);
      }

      (toUpdate as StateReference<any>).set(srcRef._toInitialize || (srcRef as any)._ref);
    }
    //
    // Arrays.
    //
    else if (toUpdate?._isStateArray || toUpdate?._isStateReferenceArray) {// || toUpdate instanceof StateObjectArrayImpl) {
      if (!(src as StateArray<any>)._isStateArray && !(src as StateReferenceArray<any>)._isStateReferenceArray)
        throw new Error("UpdateState type error when updating array.");

      copyStateArray(toUpdate, src);
    }
    //
    // Objects.
    //
    else if (toUpdate?._isStateObject) {
      if (!(src as StateObject<any>)._isStateObject)
        throw new Error("UpdateState type error when updating object.");

      let obj = toUpdate as any;
      for (let k in src) {
        if ((k as string).startsWith("_")) continue;

        if (isPrimitive(obj[k])) {
          // console.log("update ", k, " with ", src[k])
          const willNotify = obj[k] === src[k];
          obj[k] = src[k];
          if (willNotify)
            obj._notifySubscribers(k, obj[k]);
        }

        else
        {
          updateState(obj, k, src[k]);
        }
      }
    }
    //
    // Table.
    //
    else if (toUpdate?._isStateTable) {
      // console.time("load table setup");
      // console.log("_____LOAD SETUP ____");
      let srcTable = (src as StateTable<any>)
      if (!srcTable._isStateTable)
        throw new Error("UpdateState type error when updating table.");
      
      let newKeys = srcTable.map((e: any) => e.id);
      let idsToRemove = _.difference([...toUpdate.ids()], newKeys);
      // console.log("_____LOAD REMOVE ____");
      for (let id of idsToRemove)
        toUpdate.remove(id);

      // console.log("_____LOAD INSERT LOOP____");

      // console.timeEnd("load table setup");
      // console.time("load table loop");
      for (let elt of srcTable.values())
        if ((toUpdate as StateTable<any>).has(elt.id))
          updateState(toUpdate, elt.id, elt);
        else
        {
          // console.log("insert elt: ", (toUpdate as StateTable<any>)._path(), elt.id);
          toUpdate.insert(elt);
        }
      // console.timeEnd("load table loop");
        // throw new Error("not implemented");
    }
    //
    // Object props.
    //
    else { // dst[prop] is a non state value. (or it is not defined yet and we are going
      // to set it as a new statebase derived object).

      if (prop.startsWith("_")) return;

      // console.log("UPDATE STATE: ", prop, "to", src);


      dst._logger()?.groupLog(`Update ${dst._path()}/${prop} to:  `);
      dst._logger()?.log(src);

      let prev = dst[prop];

      // Registering a new prop.
      // if src is a instance of StateBase, register it as a child
      // and propagate props.
      if (prev === undefined && src?._isStateBase) {
        dst._registerChild(prop, src);
        if (dst._props)
          propagatePropIds(src, dst._props[prop]);
      }
      // else if (src?._isStateBase && dst._props && !src._props)
      //   propagatePropIds(src, dst._props[prop]);

      // assign the prop to it's new value.
      if (!dst._isStateObject && !dst._isStateArray && !dst._isStateReferenceArray) throw new Error();
      //dst[prop] = src;
      dst._internalSet(prop, src);

      // if it is different than it's previous version,
      // notify the subscribers.
      // actually it's too slow: if (!_.isEqual(prev, dst[prop]))
      if (prev !== dst[prop])
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

      dst._logger()?.groupEnd();

    }
  });

}
