"use strict";
/**
 * Update prop \prop of state dst with value src.
 * @param dst
 * @param prop
 * @param src
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateState = void 0;
const lodash_1 = __importDefault(require("lodash"));
const autorun_1 = require("./autorun");
const prop_1 = require("./prop");
const StateArray_1 = require("./StateArray");
function updateState(dst, prop, src) {
    autorun_1.autorunIgnore(() => {
        var _a, _b, _c;
        // console.log('update state! ', prop, src, dst);
        const isPrimitive = (o) => !((o === null || o === void 0 ? void 0 : o._isStateObject) || (o === null || o === void 0 ? void 0 : o._isStateArray) || (o === null || o === void 0 ? void 0 : o._isStateTable));
        let toUpdate = dst._get(prop);
        //
        // References.
        //
        if (toUpdate === null || toUpdate === void 0 ? void 0 : toUpdate._isStateReference) {
            let srcRef = src;
            if (!srcRef._isStateReference) {
                console.log(toUpdate);
                console.log(src);
                throw new Error(`UpdateState type error when updating reference ${dst._path()}/${prop}`);
            }
            toUpdate.set(srcRef._toInitialize || srcRef._ref);
        }
        //
        // Arrays.
        //
        else if ((toUpdate === null || toUpdate === void 0 ? void 0 : toUpdate._isStateArray) || (toUpdate === null || toUpdate === void 0 ? void 0 : toUpdate._isStateReferenceArray)) { // || toUpdate instanceof StateObjectArrayImpl) {
            if (!src._isStateArray && !src._isStateReferenceArray)
                throw new Error("UpdateState type error when updating array.");
            StateArray_1.copyStateArray(toUpdate, src);
        }
        //
        // Objects.
        //
        else if (toUpdate === null || toUpdate === void 0 ? void 0 : toUpdate._isStateObject) {
            if (!src._isStateObject)
                throw new Error("UpdateState type error when updating object.");
            let obj = toUpdate;
            for (let k in src) {
                if (k.startsWith("_"))
                    continue;
                if (isPrimitive(obj[k])) {
                    // console.log("update ", k, " with ", src[k])
                    const willNotify = obj[k] === src[k];
                    obj[k] = src[k];
                    if (willNotify)
                        obj._notifySubscribers(k, obj[k]);
                }
                else {
                    updateState(obj, k, src[k]);
                }
            }
        }
        //
        // Table.
        //
        else if (toUpdate === null || toUpdate === void 0 ? void 0 : toUpdate._isStateTable) {
            // console.time("load table setup");
            // console.log("_____LOAD SETUP ____");
            let srcTable = src;
            if (!srcTable._isStateTable)
                throw new Error("UpdateState type error when updating table.");
            let newKeys = srcTable.map((e) => e.id);
            let idsToRemove = lodash_1.default.difference([...toUpdate.ids()], newKeys);
            // console.log("_____LOAD REMOVE ____");
            for (let id of idsToRemove)
                toUpdate.remove(id);
            // console.log("_____LOAD INSERT LOOP____");
            // console.timeEnd("load table setup");
            // console.time("load table loop");
            for (let elt of srcTable.values())
                if (toUpdate.has(elt.id))
                    updateState(toUpdate, elt.id, elt);
                else {
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
            if (prop.startsWith("_"))
                return;
            // console.log("UPDATE STATE: ", prop, "to", src);
            (_a = dst._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Update ${dst._path()}/${prop} to:  `);
            (_b = dst._logger()) === null || _b === void 0 ? void 0 : _b.log(src);
            let prev = dst[prop];
            // Registering a new prop.
            // if src is a instance of StateBase, register it as a child
            // and propagate props.
            if (prev === undefined && (src === null || src === void 0 ? void 0 : src._isStateBase)) {
                dst._registerChild(prop, src);
                if (dst._props)
                    prop_1.propagatePropIds(src, dst._props[prop]);
            }
            // else if (src?._isStateBase && dst._props && !src._props)
            //   propagatePropIds(src, dst._props[prop]);
            // assign the prop to it's new value.
            if (!dst._isStateObject && !dst._isStateArray && !dst._isStateReferenceArray)
                throw new Error();
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
                });
            (_c = dst._logger()) === null || _c === void 0 ? void 0 : _c.groupEnd();
        }
    });
}
exports.updateState = updateState;
//# sourceMappingURL=updateState.js.map