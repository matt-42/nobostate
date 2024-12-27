"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullStateReference = exports.stateReferenceNotNull = exports.stateReference = exports.stateReferenceNotNullMixin = void 0;
const lodash_1 = __importDefault(require("lodash"));
const autorun_1 = require("./autorun");
const StateBase_1 = require("./StateBase");
// Nullable foreign key.
function stateReferenceMixin() {
    return class StateReferenceImpl extends StateBase_1.stateBaseMixin(Object) {
        constructor(idOrObj = null) {
            super();
            this._isStateReference = true;
            this._ref = null;
            this._disposeRefOnDelete = null;
            this._disposeRefOnChange = null;
            this._disposeBackReference = null;
            this._toInitialize = null;
            this._previousSetArgument = null;
            this._refListeners = [];
            this._toInitialize = idOrObj;
            this._proxifiedThis = this;
        }
        get ref() { return this._ref; }
        _setProps(props) {
            if (props._ref === undefined) {
                throw Error(`Unspecified reference ${props._path.join('.')}:
      Use specs.reference(props.${props._path.join('.')}, dstTable, options) to specify it.`);
            }
            super._setProps(props);
            this._parent._onRemoveInternal(() => {
                if (this._specs()._own) {
                    // remove ref when the parent stateobject is deleted.
                    this._removeReferencedObject(this._ref);
                }
                this._disposeReference();
            });
            // If ref is already initialized, skip initialization.
            if (!this._ref)
                this.set(this._toInitialize, false);
            // if (this._ref && this._toInitialize != this._ref)
            //   throw new Error("Error: reference::setProps: conflict between exiting ref and initialize value");
            this._toInitialize = null;
        }
        _disposeReference() {
            var _a, _b, _c;
            (_a = this._disposeRefOnDelete) === null || _a === void 0 ? void 0 : _a.call(this);
            (_b = this._disposeRefOnChange) === null || _b === void 0 ? void 0 : _b.call(this);
            (_c = this._disposeBackReference) === null || _c === void 0 ? void 0 : _c.call(this);
            this._disposeBackReference = null;
            this._disposeRefOnDelete = null;
            this._disposeRefOnChange = null;
        }
        _specs() {
            let specs = this._props;
            if (!specs)
                throw new Error();
            return specs;
        }
        _referencedTable() {
            let specs = this._specs();
            if (!specs || !specs._ref)
                throw new Error();
            return this._rootStateAccess(specs._ref._path);
        }
        _removeReferencedObject(obj) {
            if (obj)
                obj._parent.remove(obj.id);
        }
        _subscribeRef(listener, initCall = false) {
            this._refListeners.push(listener);
            if (initCall)
                listener(this);
            return () => {
                lodash_1.default.remove(this._refListeners, l => l === listener);
            };
        }
        set(idOrNewObj, notify = true) {
            autorun_1.autorunIgnore(() => {
                var _a, _b, _c, _d;
                autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.delete({ state: this, key: null });
                (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Set reference ${this._path()} to: `);
                (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.log(idOrNewObj);
                if (!this._getRootState()._history)
                    throw new Error("Cannot set a reference on a object unattached to any root state.");
                // Stop listening to previous ref onDelete.
                this._disposeReference();
                // Do not record in history the insert/remove of the referenced object.
                this._getRootState()._history.group(() => {
                    var _a, _b;
                    let previousRef = this._ref;
                    if ((_a = idOrNewObj) === null || _a === void 0 ? void 0 : _a._isStateBase) {
                        this._ref = idOrNewObj;
                        // If we will own the object check that is is not already owned. 
                        if (this._specs()._own && this._ref._backReferences(this._specs()).length) {
                            let owner = this._ref._backReferences(this._specs())[0];
                            throw new Error(`Reference is already owned by ${owner._path()}`);
                        }
                    }
                    else if (((_b = idOrNewObj) === null || _b === void 0 ? void 0 : _b.id) !== undefined) {
                        this._ref = this._referencedTable().insert(idOrNewObj);
                    }
                    else if (idOrNewObj !== null) {
                        this._ref = this._referencedTable().get(idOrNewObj) || null;
                        if (!this._ref)
                            console.warn("StateReference error: trying to reference a non existing id " + idOrNewObj +
                                `. reference : ${this._path()}. referenced table: ${this._referencedTable()._path()} `);
                        // throw new Error("StateReference error: trying to reference a non existing id " + idOrNewObj +
                        // `. reference : ${this._path()}. referenced table: ${this._referencedTable()._path()} `);
                    }
                    else {
                        this._ref = null;
                    }
                    if (this._ref)
                        this._disposeBackReference = this._ref._addBackReference(this._specs(), this._parent);
                    // let prev = this._previousSetArgument;
                    let currentRef = this._ref;
                    this._getRootState()._history.push({
                        action: "anyAction",
                        target: this,
                        propId: this._props,
                        // undo: () => this.set(prev),
                        // redo: () => this.set(idOrNewObj)
                        undo: () => this.set((previousRef === null || previousRef === void 0 ? void 0 : previousRef.id) || null),
                        redo: () => {
                            // console.log("REDO SET REF. set ref to ", currentRef?.id);
                            this.set((currentRef === null || currentRef === void 0 ? void 0 : currentRef.id) || null);
                        }
                        // undo: () => {
                        //   console.log("UNDO SET REF. set ref to ", previousRef?.id, this._referencedTable().has(previousRef?.id as any));
                        //    this._ref = previousRef ? this._referencedTable().get(previousRef.id) || null : null; },
                        // redo: () => { this._ref = currentRef ? this._referencedTable().get(currentRef.id) || null : null; },
                        // redo: () => this.set(this._ref?.id || null)
                    });
                    this._previousSetArgument = idOrNewObj;
                    // remove the referenced object if it is owned.
                    if (this._specs()._own && previousRef)
                        this._removeReferencedObject(previousRef);
                });
                // Listen to change in ref.
                // No, do not forward notifications. let the user decide with ref he want to listen to.
                // Forwarding changes in ref lead to too many unneeded notifications.
                // if (this._ref)
                //   this._disposeRefOnChange = this._ref._onChange(() => this._notifyThisSubscribers());
                // Set on delete behaviors.
                if (this._ref) {
                    this._disposeRefOnDelete = this._ref._onRemoveInternal(() => {
                        let spec = this._specs();
                        if (spec._onRefDeleted === "set-null") // SET NULL
                            this.set(null);
                        else if (spec._onRefDeleted === "cascade") // CASCADE
                         {
                            this.set(null);
                            this._parent._parent.remove(this._parent.id);
                        }
                        else if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
                         {
                            let prevRef = this._ref;
                            spec._onRefDeleted(this._parent, this._ref);
                            // the _onRefDeleted callback must update the ref. -> actually no, just set null if it did not.
                            if (this._ref === prevRef)
                                this.set(null);
                            // throw new Error(`Foreign key ${spec._path} error: onRefDelete callback did not update the outdated ref.`);
                        }
                    });
                }
                if (notify) {
                    this._notifyThisSubscribers();
                    this._runNotification(this._refListeners, this);
                    // this._refListeners.forEach(l => this._runNotification(l, this));
                }
                (_c = this._logger()) === null || _c === void 0 ? void 0 : _c.log(`${this._path()} now references ${this._ref ? this._ref._path() : "null"}`);
                (_d = this._logger()) === null || _d === void 0 ? void 0 : _d.groupEnd();
            });
        }
    };
}
function stateReferenceNotNullMixin() {
    return class StateReferenceImpl extends stateReferenceMixin() {
        constructor() {
            super(...arguments);
            this._isStateReferenceNotNull = true;
        }
        // constructor(idOrObj: IdType<T> | T | StateObject<T>) {
        //   super(idOrObj);
        // }
        get ref() {
            var _a;
            if (!this._ref)
                throw new Error(`Cannot access an uninitialized StateReferenceNotNull. When accessing ${(_a = this === null || this === void 0 ? void 0 : this._path) === null || _a === void 0 ? void 0 : _a.call(this)}`);
            return this._ref;
        }
        set(idOrNewObj) {
            if (idOrNewObj === null)
                return;
            super.set(idOrNewObj);
            // if (!this._ref && !this._parent?.__beingRemoved__)
            //   throw new Error(`StateReferenceNotNull::set resulted in a null reference: ${this._path()}`);
        }
    };
}
exports.stateReferenceNotNullMixin = stateReferenceNotNullMixin;
const stateReferenceClass = stateReferenceMixin();
const stateReferenceNotNullClass = stateReferenceNotNullMixin();
function stateReference(id) {
    return new (stateReferenceClass)(id);
}
exports.stateReference = stateReference;
function stateReferenceNotNull(id) {
    return new (stateReferenceNotNullClass)(id);
}
exports.stateReferenceNotNull = stateReferenceNotNull;
function nullStateReference() {
    return stateReference(null);
}
exports.nullStateReference = nullStateReference;
//# sourceMappingURL=StateReference.js.map