"use strict";
/**
 * From a plain javascript object, create a state object.
 * To create table:
 *   - { _stateTable: [...] }
 *   - new StateTable<T>()
 * To create an object: { _stateObject: props... }
 * @param state
 * @param propId
 * @param ignoreProps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unwrapState = exports.revive2 = exports.revive = exports.reviveReferences = void 0;
const nobostate_1 = require("./nobostate");
const StateReference_1 = require("./StateReference");
const StateReferenceArray_1 = require("./StateReferenceArray");
// Revive references after all state table elements has been revived.
function reviveReferences(state, srcData) {
    if (!state)
        return;
    if (state._isStateReference !== undefined) {
        try {
            state.set(srcData._stateReference);
        }
        catch (e) {
            console.error(`Error when setting reference: ${e}`);
            throw e;
        }
    }
    else if (state._isStateReferenceArray !== undefined) {
        state.push(...srcData._stateReferenceArray);
    }
    else if (state._isStateObject) {
        for (let k in state)
            if (!k.startsWith("_") && srcData._stateObject[k])
                reviveReferences(state[k], srcData._stateObject[k]);
        return;
    }
    else if (state._isStateTable) {
        let elements = new Map();
        srcData._stateTable.forEach((elt) => elements.set(elt._stateObject.id, elt));
        state.forEach(elt => {
            reviveReferences(elt, elements.get(elt.id));
        });
    }
    // else if (state._isStateArray) {
    //   return state;
    // }
    else if (state._isStateObjectArray) {
        for (let i = 0; i < state.length; i++)
            reviveReferences(state[i], srcData._stateObjectArray[i]);
        return;
    }
    else
        return;
}
exports.reviveReferences = reviveReferences;
function revive(state) {
    if (!state)
        return state;
    let anyState = state;
    // Do not re-bind already bound objects.
    if (anyState._isStateBase !== undefined)
        throw new Error("Cannot revive a State object");
    // if (anyState._registerChild) return state;
    // map.
    else if (anyState._stateTable !== undefined) {
        let table = nobostate_1.stateTable();
        // console.log(anyState._stateTable.length, "ids"); 
        anyState._stateTable.forEach((elt) => {
            // console.log("revive id ", elt._stateObject.id, elt._stateObject);
            table.insert(revive(elt));
        });
        return table;
    }
    // Array
    else if (anyState._stateArray !== undefined) {
        let arr = nobostate_1.stateArray();
        arr.push(...anyState._stateArray);
        return arr;
    }
    // Object Array.
    else if (anyState._stateObjectArray !== undefined) {
        let arr = nobostate_1.stateObjectArray();
        arr.push(...anyState._stateObjectArray.map(revive));
        return arr;
    }
    // Object
    else if (anyState._stateObject !== undefined) {
        let obj = nobostate_1.stateObject(Object);
        for (let k in anyState._stateObject)
            obj[k] = revive(anyState._stateObject[k]);
        return obj;
    }
    else if (anyState._stateReference !== undefined) {
        // Refs are initialized after with reviveReferences
        return anyState._notNull ?
            StateReference_1.stateReferenceNotNull(null) : StateReference_1.stateReference(null);
    }
    else if (anyState._stateReferenceArray !== undefined) {
        return StateReferenceArray_1.stateReferenceArray();
    }
    // prop
    else
        return state;
}
exports.revive = revive;
function revive2(state, parent, key) {
    //console.log("revive2 key", parent._path(), key);
    if (state == undefined || state == null)
        return state;
    let anyState = state;
    // Do not re-bind already bound objects.
    if (anyState._isStateBase !== undefined)
        throw new Error("Cannot revive a State object");
    // if (anyState._registerChild) return state;
    // map.
    else if (anyState._stateTable !== undefined) {
        // console.log("state table!")
        let table = parent[key] || nobostate_1.stateTable();
        if (!parent._getRootState()._history)
            throw new Error();
        // if (!parent._history && !parent._parent) throw new Error("Missing parent: " + parent._path());
        parent[key] = table;
        table.clear();
        if (!table._getRootState()._history)
            throw new Error("!table._getRootState()._history " + key);
        // console.log(anyState._stateTable.length, "ids"); 
        anyState._stateTable.forEach((elt) => {
            // console.log("revive id ", elt._stateObject.id, elt._stateObject);
            revive2(elt, table, elt._stateObject.id);
            // console.log(elt._stateObject.id)
        });
    }
    // Array
    else if (anyState._stateArray !== undefined) {
        let arr = parent[key] || nobostate_1.stateArray();
        if (!parent._isStateObject)
            throw new Error();
        parent[key] = arr;
        if (!arr._getRootState()._history)
            throw new Error("Missing parent: obj is stateArray");
        arr.push(...anyState._stateArray);
        return arr;
    }
    // Object Array.
    else if (anyState._stateObjectArray !== undefined) {
        let arr = parent[key] || nobostate_1.stateObjectArray();
        if (!parent._isStateObject)
            throw new Error();
        parent[key] = arr;
        if (!arr._getRootState()._history)
            throw new Error("Missing parent: obj is stateArray");
        anyState._stateObjectArray.forEach((elt, idx) => {
            revive2(elt, arr, idx);
        });
        return arr;
    }
    // Object
    else if (anyState._stateObject !== undefined) {
        let obj = parent[key] || nobostate_1.stateObject(Object);
        obj.id = anyState._stateObject.id;
        if (parent._isStateTable) {
            parent.insert(obj);
        }
        else if (parent._isStateObjectArray) {
            parent.push(obj);
        }
        else {
            parent[key] = obj;
        }
        if (!obj._getRootState()._history) {
            console.log(parent._isStateBase, parent._isRootState, Object.keys(parent), "removed", parent.__removed__);
            console.log(obj._parent === parent);
            console.log(!!parent._parent);
            throw new Error("Missing parent: obj is stateobject, parent is stateobject ");
        }
        for (let k in anyState._stateObject)
            revive2(anyState._stateObject[k], obj, k);
    }
    else if (anyState._stateReference !== undefined) {
        // Refs are initialized after with reviveReferences
        if (!parent._isStateObject)
            throw new Error();
        parent[key] = parent[key] || (anyState._notNull ?
            StateReference_1.stateReferenceNotNull(null) : StateReference_1.stateReference(null));
        // console.log(Object.keys(parent));
        if (!parent._getRootState()._history)
            throw new Error("Missing parent: obj is statereference");
    }
    else if (anyState._stateReferenceArray !== undefined) {
        if (!parent._isStateObject)
            throw new Error();
        parent[key] = parent[key] || StateReferenceArray_1.stateReferenceArray();
        if (!parent[key]._getRootState()._history)
            throw new Error("Missing parent: obj is _stateReferenceArray");
    }
    // prop
    else {
        parent[key] = state;
    }
}
exports.revive2 = revive2;
function initializePropIdentifiers(propId, state) {
    state.propId = propId;
    for (let k in state)
        if (typeof state[k] !== 'function')
            initializePropIdentifiers(propId[k], state[k]);
}
function unwrapState(state) {
    if (!state)
        return state;
    else if (state._isStateReference) { // Ref
        let ref = state;
        return { _stateReference: ref.ref ? ref.ref.id : null, _notNull: ref._isStateReferenceNotNull };
    }
    else if (state._isStateReferenceArray) { // Ref Array
        let ref = state;
        return { _stateReferenceArray: ref.map(r => r.id) };
    }
    else if (state._isStateTable) { // Table
        return { _stateTable: [...state.values()].map(v => unwrapState(v)) };
    }
    else if (state._isStateObject) { // StateObject
        let obj = {};
        let src = state;
        for (let k in src)
            if (typeof src[k] !== 'function' && !k.startsWith("_"))
                obj[k] = unwrapState(src[k]);
        return { _stateObject: obj };
    }
    else if (state._isStateArray) { // StateArray && StateObjectArray
        let stateArray = state;
        let arr = [];
        for (let i = 0; i < stateArray.length; i++)
            arr.push(unwrapState(stateArray[i]));
        if (state._isStateObjectArray)
            return { _stateObjectArray: arr };
        else
            return { _stateArray: arr };
    }
    return state;
}
exports.unwrapState = unwrapState;
//# sourceMappingURL=unwrap_revive.js.map