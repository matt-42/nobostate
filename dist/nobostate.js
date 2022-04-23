"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createState = exports.stateTable = exports.stateObjectArray = exports.stateArray = exports.stateObject = void 0;
const prop_1 = require("./prop");
const RootState_1 = require("./RootState");
const StateArray_1 = require("./StateArray");
const StateObject_1 = require("./StateObject");
const StateTable_1 = require("./StateTable");
// type ReadOnly<T> =
//   T extends Array<any> ? T :
//   T extends Object ? {
//     readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
//   } : T;
// type ReadOnlyNonStateTypes<T> =
//   T extends StateBaseInterface<infer O> ? O :
//   T extends Object ? {
//     readonly [P in keyof T]: T[P] extends Function ? T[P] : ReadOnly<T[P]>;
//   } : T;
const stateObject = (data) => new (StateObject_1.stateObjectMixin())(data);
exports.stateObject = stateObject;
const stateArray = () => new StateArray_1.StateArray();
exports.stateArray = stateArray;
const stateObjectArray = () => new StateArray_1.StateObjectArray();
exports.stateObjectArray = stateObjectArray;
const stateTable = () => new (StateTable_1.stateTableMixin())();
exports.stateTable = stateTable;
// type FilterInternalMethods<T> =
//   T extends "_registerChild" | "_notifySubscribers" |
//   "_subscribers" | "_parentListener" |
//   "_get" | "_parent" ?
//   never : T;
// type RemoveInternalMethods<T> = {
//   [K in FilterInternalMethods<keyof T>]: T[K]
// };
// type PublicStateType<T> =
//   T extends StateObject<infer O> ?
//   { [K in keyof O]: PublicStateType<O[K]> } & RemoveInternalMethods<StateObject<O>> :
//   T extends StateTable<infer O> ?
//   Map<IdType<O>, PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateTable<O>> :
//   // T extends StateObjectArray<infer O> ?
//   // Array<PublicStateType<StateObject<O>>> & RemoveInternalMethods<StateObjectArrayImpl<O>> :
//   T extends StateArray<infer O> ?
//   Array<PublicStateType<O>> & RemoveInternalMethods<StateArray<O>> :
//   T extends Function ? never :
//   T;
class SpecsBuilder {
    reference(srcProp, dstTable, options) {
        srcProp._onRefDeleted = (options === null || options === void 0 ? void 0 : options.onRefDeleted) || "set-null";
        srcProp._own = (options === null || options === void 0 ? void 0 : options.own) || false;
        srcProp._ref = dstTable;
    }
    referenceArray(srcProp, dstTable, options) {
        srcProp._onRefDeleted = (options === null || options === void 0 ? void 0 : options.onRefDeleted) || "set-null";
        srcProp._own = (options === null || options === void 0 ? void 0 : options.own) || false;
        srcProp._ref = dstTable;
    }
    undoIgnore(prop) {
        prop._undoIgnore = true;
    }
}
function createState(state, options) {
    var _a;
    let propsIds = prop_1.createPropIds();
    (_a = options === null || options === void 0 ? void 0 : options.setSpecs) === null || _a === void 0 ? void 0 : _a.call(options, propsIds, new SpecsBuilder());
    return RootState_1.makeRootState(state, propsIds, { log: (options === null || options === void 0 ? void 0 : options.log) || false });
}
exports.createState = createState;
//# sourceMappingURL=nobostate.js.map