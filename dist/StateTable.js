"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateTableMixin = exports.newStringId = exports.newIntId = void 0;
const lodash_1 = __importDefault(require("lodash"));
const autorun_1 = require("./autorun");
const prop_1 = require("./prop");
const StateBase_1 = require("./StateBase");
const StateObject_1 = require("./StateObject");
const unwrap_revive_1 = require("./unwrap_revive");
const updateState_1 = require("./updateState");
;
;
;
function newIntId() { return { _isNewIntId: true }; }
exports.newIntId = newIntId;
function newStringId() { return { _isNewStringId: true }; }
exports.newStringId = newStringId;
function stateTableMixin() {
    // const m = new Map<IdType<T>, T>()
    return class StateTableImpl extends StateBase_1.stateBaseMixin(Map) {
        constructor() {
            super(...arguments);
            this._isStateTable = true;
            this._lastInsertId = null;
            this._keyDeleteListeners = [];
            // _removeListeners = new Map<Id, (o : O) => void>();
            // onRemove(id: Id, listener: (o : O) => void) {
            //   this.assertGet(id)._removeListeners.push(listener);
            // }
            this._insertListeners = [];
        }
        onKeyDelete(listener) {
            this._keyDeleteListeners.push(listener);
            return () => lodash_1.default.remove(this._keyDeleteListeners, l => l === listener);
        }
        ids() {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return [...this.keys()];
        }
        _subscribeIds(listener) {
            let disposers = [
                this.onInsert(() => listener(this.ids())),
                this.onKeyDelete(() => listener(this.ids()))
            ];
            return () => disposers.forEach(f => f());
        }
        map(f) {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return [...this.values()].map(f);
        }
        flatMap(f) {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return [...this.values()].flatMap(f);
        }
        find(predicate) {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return [...this.values()].find(predicate);
        }
        filter(predicate) {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return [...this.values()].filter(predicate);
        }
        values() {
            autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
            return super.values();
        }
        onInsert(listener) {
            // Fixme remove onInsertInternal, seems like it's useless.
            // const ignoredListener = listener;//(o: StateObject<T>) => this._getRootState()._history.ignore(() => listener(o));
            const ignoredListener = (o) => { if (!o.__removed__)
                listener(o); };
            this._insertListeners.push(ignoredListener);
            return () => lodash_1.default.remove(this._insertListeners, l => l === ignoredListener);
        }
        onInsertInternal(listener) {
            this._insertListeners.push(listener);
            return () => lodash_1.default.remove(this._insertListeners, l => l === listener);
        }
        attach(fun) {
            let disposed = false;
            const onRemoveDisposers = [];
            const attachToObject = (object) => {
                let onRemove = fun(object);
                if (onRemove) {
                    // on detach, unsubscribe to onDelete and call the onRemove callback.
                    onRemoveDisposers.push(object._onRemove(() => {
                        if (!disposed && onRemove) {
                            onRemove();
                            lodash_1.default.remove(onRemoveDisposers, f => f === onRemove);
                        }
                    }));
                    onRemoveDisposers.push(onRemove);
                }
            };
            let disposeOnInsert = this.onInsert(attachToObject);
            for (let obj of this.values())
                attachToObject(obj);
            return () => { disposeOnInsert(); onRemoveDisposers.forEach(f => f()); disposed = true; };
        }
        insert(value) {
            var _a;
            const run = ((_a = this._getRootState()) === null || _a === void 0 ? void 0 : _a._transaction) || ((x) => { return x(); });
            const run2 = ((x) => { return autorun_1.autorunIgnore(() => run(x)); });
            return run2(() => {
                var _a, _b, _c, _d;
                let insert_code = () => {
                    var _a, _b;
                    // Compute new id if needed.
                    if (value.id._isNewIntId === true) {
                        let id = (this._lastInsertId || 0) + 1;
                        while (this.has(id))
                            id++;
                        value = Object.assign(Object.assign({}, value), { id });
                    }
                    if (value.id._isNewStringId === true) {
                        let id = parseInt(this._lastInsertId || "0") + 1;
                        while (this.has(id.toString()))
                            id++;
                        value = Object.assign(Object.assign({}, value), { id: id.toString() });
                    }
                    // check if id already exists.
                    if (this.has(value.id))
                        throw new Error(`table ${this._path()} with id ${value.id} already exists`);
                    // Insert a new placeholder stateObject in the map.
                    // if value is already a state object, insert it directly.
                    let valueIsAlreadyAStateObject = value._isStateObject;
                    let elt = (valueIsAlreadyAStateObject ? value : StateObject_1.anyStateObject());
                    super.set(value.id, elt);
                    // console.log(`${this._props?._path.join('/')}: insert id`, value.id);
                    // Update the placeholder with the new element attributes.
                    // updateState(this, value.id, value);
                    if (!valueIsAlreadyAStateObject)
                        autorun_1.autorunIgnore(() => elt._update(value));
                    let id = elt.id;
                    this._registerChild(id, elt);
                    prop_1.propagatePropIds(elt, this._props);
                    this._lastInsertId = id;
                    this._notifySubscribers(id, elt);
                    // console.log(this._getRootState());
                    // console.log(this._getRootState()._history);
                    if (this._insertListeners.length) {
                        (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Calling onInsert listeners for ${this._path()}`);
                        // [...this._insertListeners].forEach(f => this._runNotification(f, elt));
                        this._runNotification(this._insertListeners, elt);
                        (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.groupEnd();
                    }
                    const history = this._getRootState()._history;
                    if (history && this._props)
                        history.push({
                            action: "insert",
                            propId: this._props,
                            target: this,
                            element: elt
                        });
                    return elt;
                };
                (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Insert in table ${this._path()} element: `);
                // if ((value as StateObject<T>)._isStateObject)
                //   this._logger()?.log(`stateObject with id ${value.id}`);
                (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.log(value);
                let res = ((_c = this._getRootStateHistory()) === null || _c === void 0 ? void 0 : _c.group(insert_code)) || insert_code();
                (_d = this._logger()) === null || _d === void 0 ? void 0 : _d.groupEnd();
                return res;
            });
        }
        clone(id, newId_) {
            let obj = this.assertGet(id);
            let newId = newId_;
            if (!newId) {
                // find a new unique id.
                let toIdType = typeof obj.id === "number" ? (i) => i : (i) => i.toString();
                let i = this.size;
                while (this.has(toIdType(i)))
                    i++;
                newId = toIdType(i);
            }
            let clone = unwrap_revive_1.unwrapState(obj);
            clone._stateObject.id = newId;
            // console.log(clone);
            let bind = unwrap_revive_1.revive(clone);
            this.insert(bind);
            return bind;
        }
        set(id, value) {
            // if (!this.has(id))
            //   return this.insert(value as any as T);
            // else
            return this._set(id, value);
        }
        assertGet(id) {
            var _a;
            let res = this.get(id);
            if (!res)
                throw new Error(`StateTable get error: id ${id.toString()} does not exists in table ${(_a = this._props._path) === null || _a === void 0 ? void 0 : _a.join('/')}`);
            return res;
        }
        _get(id) {
            return this.assertGet(id);
        }
        _set(id, val) {
            if (this.has(id))
                updateState_1.updateState(this, id, val);
            else
                this.insert(val);
            return this;
        }
        clear() {
            while (this.size)
                for (let id of this.keys()) {
                    if (this.has(id))
                        this.remove(id);
                }
        }
        remove(id) {
            autorun_1.autorunIgnore(() => {
                var _a, _b, _c, _d;
                // console.trace();
                let root = this._getRootState();
                let eltToDelete = this.get(id);
                if (!eltToDelete)
                    return;
                // Avoid infinit loop when own == true and onRefDeleted == cascade.
                if (eltToDelete.__beingRemoved__)
                    return;
                eltToDelete.__beingRemoved__ = true;
                // console.log("remove ", `remove-${this._path()}-${id}`, this.has(id), this.get(id)?.__beingRemoved__);
                (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Remove ${eltToDelete._path()}`);
                if (eltToDelete._beforeRemoveListeners.length) {
                    (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.groupLog(`Calling onRemove listeners of ${eltToDelete._path()}`);
                    [...eltToDelete._beforeRemoveListeners].forEach((f) => f(eltToDelete));
                    eltToDelete._beforeRemoveListeners.length = 0;
                    (_c = this._logger()) === null || _c === void 0 ? void 0 : _c.groupEnd();
                }
                // console.trace();
                // Use a transaction so that no listeners is called in the middle of the removal.
                root._transaction(() => {
                    // Group all actions related to 1 remove.
                    root._history.group(() => {
                        // this._insertListeners.forEach(f => f(eltToDelete._wrapped));
                        var _a, _b, _c;
                        // call the on delete listeners.
                        // clone the array because listeners can remove themselves from the array, breaking foreach.
                        // [...eltToDelete._removeListeners].forEach((f: any) => this._runNotification(f, eltToDelete));
                        if (eltToDelete._removeListeners.length) {
                            (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Calling onRemove listeners of ${eltToDelete._path()}`);
                            [...eltToDelete._removeListeners].forEach((f) => f(eltToDelete));
                            eltToDelete._removeListeners.length = 0;
                            (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.groupEnd();
                        }
                        // Then we remove the element from the table.
                        // Note: we must do it after removelisteners because they may need to retreive info
                        // about the element being removed.
                        if (!this.delete(id))
                            throw new Error();
                        (_c = this._logger()) === null || _c === void 0 ? void 0 : _c.log(`Deleted ${eltToDelete._path()}`);
                        this._keyDeleteListeners.forEach(f => f());
                        // [...this._thisSubscribers].forEach(f => this._runNotification(f, this, id));
                        this._runNotification(this._thisSubscribers, this, id);
                        // if (this._parentListener)
                        //   this._runNotification(this._parentListener);
                        this._runNotification(this);
                        // Record the remove in the history.
                        this._getRootState()._history.push({
                            action: "remove",
                            propId: this._props,
                            target: this,
                            element: eltToDelete
                        });
                        // this._getRootState()._history.push({
                        //   action: "anyAction",
                        //   propId: this._props,
                        //   target: this as any,
                        //   undo: () => this.set(id, eltToDelete),
                        //   redo: () => this.delete(id),   
                        // } as HistoryTableAction);
                    });
                });
                // console.log("remove done ", `remove-${this._path()}-${id}`);
                (_d = this._logger()) === null || _d === void 0 ? void 0 : _d.groupEnd();
                eltToDelete.__beingRemoved__ = undefined;
                eltToDelete.__removed__ = true;
            });
        }
    };
}
exports.stateTableMixin = stateTableMixin;
//# sourceMappingURL=StateTable.js.map