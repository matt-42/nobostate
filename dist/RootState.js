"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRootState = exports.RootStateImpl = void 0;
const history_1 = require("./history");
const prop_1 = require("./prop");
const StateBase_1 = require("./StateBase");
const StateObject_1 = require("./StateObject");
const unwrap_revive_1 = require("./unwrap_revive");
const ignoreNotifications_1 = require("./ignoreNotifications");
class RootStateImpl extends StateObject_1.stateObjectMixin() {
    constructor(obj, options) {
        super(obj);
        this._history = new history_1.NoboHistory(this);
        this._isRootState = true;
        this._inTransaction = false;
        this._transactionCompleteListeners = new Map();
    }
    _checkReferencesNotNull(skipLog = false) {
        // console.log("_checkReferencesNotNull ");
        let valid = true;
        this._traverse((node) => {
            const ref = node;
            // console.log("check ", ref._path());
            if (ref._isStateReferenceNotNull) {
                valid && (valid = ref._ref !== null);
                if (!skipLog && ref._ref === null)
                    console.error("Error: reference", ref._path(), "should not be null");
            }
        });
        return valid;
    }
    _load(data) {
        try {
            ignoreNotifications_1.ignoreNotifications.current = true;
            this._transaction(() => {
                this._history.ignore(() => {
                    for (let k in data._stateObject) {
                        if (!k.startsWith("_"))
                            unwrap_revive_1.revive2(data._stateObject[k], this, k);
                    }
                    unwrap_revive_1.reviveReferences(this, data);
                });
            });
            if (!this._checkReferencesNotNull()) {
                throw new Error("Error, found at least one non null reference in the model");
            }
        }
        finally {
            ignoreNotifications_1.ignoreNotifications.current = false;
        }
    }
    _beginTransaction() {
        this._inTransaction = true;
    }
    _commitTransaction() {
        // Do not record state update of listeners in history.
        this._history.ignore(() => {
            while (this._transactionCompleteListeners.size) {
                this._transactionCompleteListeners.forEach((argsArray, listener) => {
                    const clone = [...argsArray];
                    argsArray.length = 0;
                    clone.forEach(callInfo => {
                        // if one of the ancestor object has been removed, do not call the listener.
                        let it = callInfo.object;
                        let isRemoved = it.__removed__ || it.__beingRemoved__;
                        while (it && !isRemoved) {
                            isRemoved || (isRemoved = it.__removed__ || it.__beingRemoved__);
                            it = it._parent;
                        }
                        if (!isRemoved)
                            StateBase_1.callListeners(listener, ...callInfo.args);
                    });
                    if (argsArray.length === 0)
                        this._transactionCompleteListeners.delete(listener);
                });
            }
        });
        this._inTransaction = false;
    }
    _transaction(transactionBody) {
        if (this._inTransaction)
            return transactionBody();
        else {
            try {
                this._beginTransaction();
                return transactionBody();
            }
            finally {
                this._commitTransaction();
            }
        }
    }
    _notification(object, listeners, ...args) {
        if (!this._inTransaction) {
            // Do not record actions performed by listeners in history as
            // they must be undone by listeners.
            if (this._history)
                this._history.ignore(() => {
                    StateBase_1.callListeners(listeners, ...args);
                });
            else
                StateBase_1.callListeners(listeners, ...args);
        }
        else {
            let callInfo = this._transactionCompleteListeners.get(listeners);
            if (!callInfo) {
                callInfo = [];
                this._transactionCompleteListeners.set(listeners, callInfo);
            }
            if (!callInfo)
                throw new Error();
            // Only push args if it does not already exists.
            // console.log(args);
            // console.log(argsArray);
            // too slow!
            // if (-1 === callInfo.findIndex(elt => _.isEqual(elt.args, args)))
            callInfo.push({ object, args });
        }
    }
}
exports.RootStateImpl = RootStateImpl;
function makeRootState(state, propId, options) {
    let wrapped = new RootStateImpl(state, options);
    prop_1.propagatePropIds(wrapped, propId);
    return wrapped;
}
exports.makeRootState = makeRootState;
//# sourceMappingURL=RootState.js.map