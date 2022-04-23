"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propagatePropIds = exports.createPropIds = void 0;
;
function createPropIds(options_) {
    let cpt = 0;
    let options = options_ || {
        path: [], getNextId: () => { return cpt++; }
    };
    let target = {
        _path: options.path,
        _propId: options.getNextId(),
        _undoIgnore: false,
    };
    return new Proxy(target, {
        get: (target, prop, receiver) => {
            let sprop = prop;
            // console.log(`get ${sprop} `)
            if (target[sprop] !== undefined || (typeof sprop === "string" && sprop.startsWith('_')))
                return target[sprop];
            else {
                // console.log("create prop", sprop);
                target[sprop] = createPropIds({ path: [...options.path, sprop], getNextId: options.getNextId });
                return target[sprop];
            }
        }
    });
}
exports.createPropIds = createPropIds;
function propagatePropIds(state, propId) {
    if (!propId)
        return;
    if ((state === null || state === void 0 ? void 0 : state._isStateBase) === true)
        state._setProps(propId);
    if ((state === null || state === void 0 ? void 0 : state._isStateTable) === true) {
        let values = state.values();
        for (let obj of values)
            propagatePropIds(obj, propId);
    }
    else if ((state === null || state === void 0 ? void 0 : state._isStateObject) === true) {
        for (let k in state) {
            if (!k.startsWith("_"))
                propagatePropIds(state[k], propId[k]);
        }
    }
    else if ((state === null || state === void 0 ? void 0 : state._isStateArray) === true) { // || state instanceof StateObjectArray) {
        for (let k of state)
            propagatePropIds(k, propId);
    }
}
exports.propagatePropIds = propagatePropIds;
//# sourceMappingURL=prop.js.map