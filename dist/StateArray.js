"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateObjectArray = exports.StateArray = exports.copyStateArray = void 0;
const autorun_1 = require("./autorun");
const nobostate_1 = require("./nobostate");
const prop_1 = require("./prop");
const StateBase_1 = require("./StateBase");
const updateState_1 = require("./updateState");
function copyStateArray(dst_, src) {
    let dst = dst_;
    if (dst_._isStateReferenceArray) {
        dst.clear();
        let srcArray = src;
        if (!srcArray._isStateReferenceArray)
            throw new Error("reference array copy, type error.");
        dst.push(...(srcArray._toInitialize || srcArray));
        return;
    }
    // Resize dst array if too large.
    while (dst.length > src.length)
        dst.pop();
    // Update existing elements of the array.
    for (let i = 0; i < dst.length; i++)
        updateState_1.updateState(dst, i, src[i]);
    // Insert new elements.
    for (let i = dst.length; i < src.length; i++) {
        dst.push(src[i]);
    }
    // Check that arrayToUpdate and src have the same size.    
    if (dst.length != src.length)
        throw new Error();
}
exports.copyStateArray = copyStateArray;
// export class StateObjectArrayImpl<T> extends
//   StateBaseClass<StateObjectArrayImpl<T>, { [K in keyof T]: StatePropIdentifiers<T[K]> } & PropSpec>  {
//   _isObjectArray = true; // Just to differenciate with StateArrayImpl
//   _wrapped = [] as StateObject<T>[];
//   push(...elements: T[]) {
//     elements.forEach(elt => {
//       let o: StateObject<T> = elt instanceof StateBaseClass ? elt as any : stateObject(elt);
//       // let o = stateObject<T>(elt, this._propId);
//       propagatePropIds(o, this._props);
//       this.push(o);
//       this._registerChild(this.length - 1, o);
//       this._notifySubscribers(this.length - 1, o);
//       this._getRootState()._history.push({
//         action: "push",
//         propId: this._props,
//         target: this,
//         element: o
//       } as HistoryArrayAction)
//     });
//   }
//   remove(index: number) {
//     this.splice(index, 1);
//     for (let i = index; i < this.length; i++)
//       this._notifySubscribers(i, this[i]);
//   }
//   clear() {
//     this.length = 0;
//     this._parentListener?.();
//     this._thisSubscribers.map(s => s(this, -1));
//   }
//   copy(other: T[]) { copyStateArray(this, other); }
//   _get(i: number) {
//     return this[i as number];
//   }
//   _set(i: number, val: T) {
//     if (this.length <= i)
//       throw new Error(`StateArray: access out of bound (index: ${i}, array size: ${this.length})`);
//     updateState(this, i, val);
//   }
//   _use(): StateObjectArray<T>
//   _use(index: number): T
//   _use(index?: any): any { return useNoboState(this, index); }
//   _subscribe(listener: Subscriber<StateObjectArray<T>>): () => void
//   _subscribe(propOrId: string, listener: Subscriber<T>): () => void
//   _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }
// }
// type StateArray2 = ReturnType<typeof stateArrayMixin>;
// let x = new (stateArrayMixin<{ id: number }>());
// let X = typeof  new (stateArrayMixin<{id : number}>());
// type R = ReturnType<typeof stateArrayMixin>
// type T = (typeof stateArrayMixin)<{
//   id: number;
// }>.StateArray
class StateArray extends StateBase_1.stateBaseMixin(Object) {
    constructor() {
        super();
        this._wrapped = [];
        this._isStateArray = true;
        this._proxifiedThis = new Proxy(this, {
            get: (target, prop, receiver) => {
                let res = Reflect.get(target, prop);
                // console.log("access proxy  ", prop, typeof prop)
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
        return this._proxifiedThis;
    }
    get length() {
        const l = this._wrapped.length;
        autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: this, key: null }, true);
        return l;
    }
    set length(l) {
        this._wrapped.length = l;
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
    push(...elements) {
        elements.forEach(elt => {
            var _a, _b;
            this._wrapped.push(elt);
            this._notifySubscribers(this.length - 1, elt);
            (_b = (_a = this._getRootState()) === null || _a === void 0 ? void 0 : _a._history) === null || _b === void 0 ? void 0 : _b.push({
                action: "push",
                propId: this._props,
                target: this,
                element: elt
            });
        });
        return this.length;
    }
    _internalSet(index, val) {
        this._wrapped[index] = val;
    }
    remove(index) {
        this._wrapped.splice(index, 1);
        if (index === this.length)
            this._notifyThisSubscribers();
        else
            for (let i = index; i < this.length; i++)
                this._notifySubscribers(i, this._wrapped[i]);
    }
    pop() {
        const res = this._wrapped.pop();
        this._notifyThisSubscribers();
        return res;
    }
    clear() {
        var _a;
        this.length = 0;
        (_a = this._parentListener) === null || _a === void 0 ? void 0 : _a.call(this);
        this._thisSubscribers.map(s => s(this, -1));
    }
    copy(other) { copyStateArray(this, other); }
}
exports.StateArray = StateArray;
class StateObjectArray extends StateArray {
    constructor() {
        super(...arguments);
        this._isStateObjectArray = true;
    }
    push(...elements) {
        elements.forEach(value => {
            let elt = value._isStateObject ? value : nobostate_1.stateObject(value);
            super.push(elt);
            this._registerChild(this.length - 1, elt);
            prop_1.propagatePropIds(elt, this._props);
        });
        return this.length;
    }
}
exports.StateObjectArray = StateObjectArray;
// export type StateArray<T> = StateArrayInterface<T>;
// export type StateObjectArray<T> = StateObjectArrayInterface<T>;
//# sourceMappingURL=StateArray.js.map