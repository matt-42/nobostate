"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateReferenceArray = exports.StateReferenceArray = void 0;
const StateBase_1 = require("./StateBase");
const autorun_1 = require("./autorun");
const updateState_1 = require("./updateState");
class StateReferenceArray extends StateBase_1.stateBaseMixin(Object) {
    constructor(array) {
        super();
        this._wrapped = [];
        this._isStateReferenceArray = true;
        this._refDisposers = new Map();
        this._toInitialize = array || [];
        return this._proxifiedThis = new Proxy(this, {
            get: (target, prop, receiver) => {
                let res = Reflect.get(target, prop);
                if (typeof res === "function")
                    return res.bind(target);
                else if (typeof prop === "number") {
                    // console.log("access proxy number ", prop)
                    return this.get(prop);
                }
                else if (typeof prop === "string" && !isNaN(parseInt(prop))) {
                    // console.log("access proxy number ", prop, parseInt(prop))
                    return this.get(parseInt(prop));
                }
                else {
                    //if (!(prop as string).startsWith("_") && !res?._isStateBase)
                    // console.log("access ", prop);
                    autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: target, key: prop }, true);
                    return res;
                }
            },
            set: (target, prop, value, receiver) => {
                // console.log(' set ',  prop, ' to ', value);
                if (typeof prop === "number" || typeof prop === "string" && !isNaN(parseInt(prop)))
                    updateState_1.updateState(receiver, prop, value);
                else
                    target[prop] = value;
                // (target as any)._set(prop, value);
                return true;
            },
        });
    }
    get length() {
        const l = this._wrapped.length;
        // console.log("get length ref array ");
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return l;
    }
    set length(l) {
        this._wrapped.length = l;
        // console.log("set length ref array ");
        this._notifyThisSubscribers();
    }
    get(i) {
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: i }, true);
        return this._wrapped[i];
    }
    [Symbol.iterator]() {
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return this._wrapped[Symbol.iterator]();
    }
    forEach(f) {
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return this._wrapped.forEach(f);
    }
    map(f) {
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return this._wrapped.map(f);
    }
    findIndex(f) {
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return this._wrapped.findIndex(f);
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
    _setProps(props) {
        if (props._ref === undefined) {
            throw Error(`Unspecified reference array ${props._path.join('.')}:
        Use specs.referenceArray(props.${props._path.join('.')}, dstTable, options) to specify it.`);
        }
        super._setProps(props);
        this._parent._onRemoveInternal(() => {
            if (this._specs()._own) {
                // console.log(this);
                // remove refs when we own the ref and when the parent stateobject is deleted.
                while (this.length)
                    this._wrapped[0]._parent.remove(this._wrapped[0].id);
            }
            // dispose all refs.
            for (let disposers of this._refDisposers.values())
                disposers.forEach(f => f());
            this._refDisposers.clear();
            this.length = 0;
        });
        this.push(...this._toInitialize);
        this._toInitialize.length = 0;
    }
    clear() {
        this.remove(() => true);
    }
    disposeRemovedElement(o) {
        // dispose ref and clear disposers.
        let disposers = this._refDisposers.get(o.id);
        // check if there is another  occurence of o in the array.
        if (-1 !== this._wrapped.findIndex(x => x === o))
            return;
        if (!(disposers === null || disposers === void 0 ? void 0 : disposers.length)) {
            throw new Error();
        }
        if (disposers) {
            disposers.forEach(f => f());
            this._refDisposers.delete(o.id);
        }
    }
    registerNewElement(ref) {
        // Init disposers.
        this._refDisposers.set(ref.id, []);
        let refDisposer = this._refDisposers.get(ref.id);
        if (!refDisposer)
            throw new Error();
        // Add the back reference.
        refDisposer.push(ref._addBackReference(this._specs(), this._parent));
        // Listen to change in ref.
        // Actually no, do not forward notifications. let the user decide with ref he want to listen to.
        // Forwarding changes in ref lead to too many unneeded notifications.
        // refDisposer.push(ref._onChange(() => this._notifyThisSubscribers()));
        // Setup on ref delete behaviors.
        refDisposer.push(ref._onRemoveInternal(() => {
            let spec = this._specs();
            this.remove(r => r === ref);
            if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
                spec._onRefDeleted(this._parent, ref);
        }));
    }
    remove(filter) {
        let indicesToRemove = [];
        this.forEach((val, idx) => { if (filter(val))
            indicesToRemove.push(idx); });
        const elementsRemoved = [];
        indicesToRemove.forEach((index, indexPosition) => {
            var _a, _b;
            let actualIndex = index - indexPosition;
            let o = this._wrapped.splice(actualIndex, 1)[0];
            if (!o)
                throw new Error();
            (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Remove id ${o.id} from reference Array ${this._path()}`);
            elementsRemoved.push(o);
            this._getRootState()._history.push({
                action: "anyAction",
                target: this,
                propId: this._props,
                undo: () => this.insert(o, actualIndex),
                redo: () => this.remove(x => x.id === o.id),
            });
            this.disposeRemovedElement(o);
            // remove the refd object if we own it.
            if (this._specs()._own)
                o._parent.remove(o.id);
            (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.groupEnd();
        });
        if (elementsRemoved.length > 0)
            this._notifyThisSubscribers();
        return elementsRemoved;
    }
    _internalSet(index, obj) {
        // if (index < 0 || index >= this.length) {
        //   throw new Error(`StateReferenceArray error: index out of bound: ${index} current length is ${this.length}`);
        // }
        if (this._wrapped[index])
            this.disposeRemovedElement(this._wrapped[index]);
        this._wrapped[index] = obj;
        this.registerNewElement(obj);
    }
    insert(elt, index) {
        var _a, _b, _c, _d;
        (_a = this._logger()) === null || _a === void 0 ? void 0 : _a.groupLog(`Insert into reference Array ${this._path()} at position ${index}: `);
        (_b = this._logger()) === null || _b === void 0 ? void 0 : _b.log(elt);
        if (Array.isArray(elt))
            throw new Error("type error: referenceArray::push takes elements, not array. Use push(...array) instead.");
        let ref = null;
        if (elt._isStateBase) {
            ref = elt;
            if (!this._referencedTable().has(ref.id))
                this._referencedTable().insert(ref);
        }
        else if (((_c = elt) === null || _c === void 0 ? void 0 : _c.id) !== undefined) {
            ref = this._referencedTable().insert(elt);
        }
        else {
            ref = this._referencedTable().get(elt) || null;
            if (!ref)
                throw new Error(`StateReferenceArray error: trying to create a ref to the non existing id ${elt} 
          of table '${this._referencedTable()._path()}`);
        }
        if (!ref)
            throw new Error();
        this._wrapped.splice(index, 0, ref);
        this._getRootState()._history.push({
            action: "anyAction",
            target: this,
            propId: this._props,
            undo: () => this.remove(o => o.id === (ref === null || ref === void 0 ? void 0 : ref.id)),
            redo: () => { if (ref)
                this.push(ref); }
        });
        this.registerNewElement(ref);
        (_d = this._logger()) === null || _d === void 0 ? void 0 : _d.groupEnd();
        this._notifyThisSubscribers();
    }
    push(...elements) {
        // insertion of all elements grouped makes 1 history group.
        const insertall = () => {
            elements.forEach(elt => {
                this.insert(elt, this.length);
            });
        };
        this._getRootState()._ignoreNotifications(() => {
            this._getRootState()._history ? this._getRootState()._history.group(insertall) : insertall();
        });
        // only one notification for all insertions.
        if (elements.length)
            this._notifyThisSubscribers();
        return this.length;
    }
    pop() {
        const res = this._wrapped.pop();
        this._notifyThisSubscribers();
        return res;
    }
}
exports.StateReferenceArray = StateReferenceArray;
// export type StateReferenceArray<T> = {
//   _isStateReferenceArray: boolean;
//   _toInitialize: (IdType<T> | T)[];
//   clear(): void;
//   remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[];
//   push(...elements: (IdType<T> | T | StateObject<T>)[]): number;
// } & StateObjectArray<T>;
function stateReferenceArray(elts) {
    return new StateReferenceArray(elts);
}
exports.stateReferenceArray = stateReferenceArray;
//# sourceMappingURL=StateReferenceArray.js.map