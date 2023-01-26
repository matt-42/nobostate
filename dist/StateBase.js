"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateBaseMixin = exports.callListeners = void 0;
const lodash_1 = __importDefault(require("lodash"));
const history_1 = require("./history");
// import { updateState } from "./updateState";
function callListeners(listeners, ...args) {
    var _a;
    if (!Array.isArray(listeners)) {
        (_a = listeners._parentListener) === null || _a === void 0 ? void 0 : _a.call(listeners);
        return;
    }
    else {
        // console.log("CALL LISTENERS START");
        // We clone the listeners because we don't want to
        // call the listeners that may be added by the present listeners.
        [...listeners].forEach(l => {
            // Check if l is still in the original listeners array.
            // because it may have been removed by other listerners.
            if (listeners.includes(l) && true)
                l(...args);
        });
        // console.log("CALL LISTENERS END");
    }
}
exports.callListeners = callListeners;
function stateBaseMixin(wrapped) {
    return class StateBaseClass extends wrapped {
        constructor(...args) {
            super(...args);
            this._isStateBase = true;
            this.__removed__ = false;
            this._proxifiedThis = null;
            this._parent = null;
            this._props = null;
            this._subscribers = {};
            this._thisSubscribers = [];
            this._parentListener = null;
            this._removeListeners = [];
            this._beforeRemoveListeners = [];
            this._dummyHistory = new history_1.DummyHistory();
            this._parentDispose = null;
            this._children = [];
        }
        _onChange(listener) {
            this._thisSubscribers.push(listener);
            return () => {
                const nRemoved = lodash_1.default.remove(this._thisSubscribers, l => l === listener).length;
                if (nRemoved !== 1)
                    throw new Error(`nRemoved ${nRemoved} should be 1`);
            };
        }
        _onRemove(listener) {
            const ignoredListener = (o) => this._getRootState()._history.ignore(() => listener(o));
            this._removeListeners.push(ignoredListener);
            return () => lodash_1.default.remove(this._removeListeners, l => l === ignoredListener);
        }
        _onRemoveInternal(listener) {
            this._removeListeners.push(listener);
            return () => lodash_1.default.remove(this._removeListeners, l => l === listener);
        }
        _onBeforeRemove(listener) {
            const ignoredListener = (o) => this._getRootState()._history.ignore(() => listener(o));
            this._beforeRemoveListeners.push(ignoredListener);
            return () => lodash_1.default.remove(this._beforeRemoveListeners, l => l === ignoredListener);
        }
        _setProps(props) {
            this._props = props;
        }
        _getRootStateHistory() {
            const h = this._getRootState()._history;
            if (h)
                return h;
            return this._dummyHistory;
        }
        _getRootState() {
            let it = this;
            while (it._parent)
                it = it._parent;
            if (!it)
                throw new Error();
            // if (!(it as any)._history)
            // throw new Error('Root state has no _history field.');
            return it;
        }
        _rootStateAccess(path) {
            let elt = this._getRootState();
            for (let key of path)
                elt = elt._get(key);
            if (!elt)
                throw new Error(`rootStateAccess error: cannot access ${path.join('.')}`);
            return elt;
        }
        _logger() {
            var _a;
            return (_a = this._getRootState()) === null || _a === void 0 ? void 0 : _a._loggerObject;
        }
        _subscribeSelector(selector, compute, initCall = false) {
            let prev = null;
            this._subscribe(() => {
                let selected = selector(this);
                if (!lodash_1.default.isEqual(prev, selected)) {
                    prev = selected;
                    compute(selected);
                }
            }, initCall);
        }
        _subscribe(listener, initCall = false) {
            if (typeof listener !== 'function')
                throw new Error("Type error: listener is not a function.");
            this._thisSubscribers.push(listener);
            if (initCall)
                listener(this, null);
            return () => {
                if (lodash_1.default.remove(this._thisSubscribers, s => s === listener).length !== 1) {
                    // throw new Error();
                }
            };
        }
        _subscribeKey(key, listener, initCall = false) {
            var _a, _b;
            (_a = this._subscribers)[_b = key] || (_a[_b] = []);
            let subs = this._subscribers[key];
            subs.push(listener);
            if (initCall && this[key] !== undefined)
                listener(this[key], key);
            return () => {
                if (lodash_1.default.remove(subs, s => s === listener).length !== 1) {
                    // throw new Error();
                }
            };
        }
        _path() {
            let it = this;
            if (!this._parent)
                return '';
            else {
                let parentPath = this._parent._path();
                if (this._parent._isStateTable)
                    return parentPath + '[' + this.id + ']';
                else
                    return parentPath + '/' + lodash_1.default.last(this._props._path);
            }
        }
        _subscribeKeys(keys, listener, initCall = false) {
            let disposers = keys.map(k => this._subscribeKey(k, (v, updatedKey) => listener(this, updatedKey), initCall));
            return () => disposers.forEach(f => f());
        }
        _get(prop) { return this[prop]; }
        // _set<P extends ThisKeys>(prop: P, value: ThisKeyAccessType<P>) {
        //   updateState(this, prop, value);
        // }
        _runNotification(listeners, ...args) {
            if (!this.__beingRemoved__ && !this.__removed__) {
                let root = this._getRootState();
                if (root._notification)
                    root._notification(this, listeners, ...args);
                else
                    callListeners(listeners, ...args);
            }
        }
        // A prop has been updated.
        // notify subscribers and the parent.
        _notifySubscribers(propOrId, value) {
            var _a, _b;
            (_a = this._subscribers)[_b = propOrId] || (_a[_b] = []);
            this._runNotification(this._subscribers[propOrId], this._get(propOrId), propOrId);
            this._runNotification(this._thisSubscribers, this, propOrId);
            // [...this._subscribers[propOrId as string] || []].forEach(sub => this._runNotification(sub, this._get(propOrId), propOrId));
            // [...this._thisSubscribers].forEach(sub => this._runNotification(sub, this, propOrId));
            this._runNotification(this); // runs this.parentListener. 
        }
        _notifyThisSubscribers() {
            // [...this._thisSubscribers].forEach(sub => this._runNotification(sub, this, null as any));
            this._runNotification(this._thisSubscribers, this, null);
            this._runNotification(this); // runs this.parentListener. 
        }
        _registerChild(propOrId, child) {
            // console.log("1- push child for ");
            var _a;
            if (child._isStateBase) {
                let childBase = child;
                // when a child prop change.
                // we notify childs subscriber and the parent.
                childBase._parent = this._proxifiedThis || this;
                childBase._parentListener = () => {
                    this._notifySubscribers(propOrId, child);
                };
                (_a = childBase._parentDispose) === null || _a === void 0 ? void 0 : _a.call(childBase);
                // Propagate the __removed__ flag to children.
                const disposeOnRemove = this._onRemove(() => {
                    childBase.__removed__ = true;
                    [...childBase._removeListeners].forEach((f) => f(childBase));
                });
                // Add the child the the children array.
                this._children.push(child);
                // console.log("push child for ", propOrId);
                childBase._parentDispose = () => {
                    lodash_1.default.remove(this._children, c => c === child);
                    disposeOnRemove();
                };
            }
        }
        _traverse(fun) {
            for (let child of this._children) {
                // if (k !== "_parent" && this[k] && (this[k] as any)._isStateBase && !(this[k] as any)._isStateReference)
                // {
                //   fun(this[k] as any);
                //   (this[k] as any as StateBaseClass)._traverse(fun);
                // }
                fun(child);
                child._traverse(fun);
                // }
            }
        }
    };
}
exports.stateBaseMixin = stateBaseMixin;
//# sourceMappingURL=StateBase.js.map