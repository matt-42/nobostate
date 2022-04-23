"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anyStateObject = exports.stateObjectMixin = void 0;
const lodash_1 = __importDefault(require("lodash"));
const autorun_1 = require("./autorun");
const StateBase_1 = require("./StateBase");
const updateState_1 = require("./updateState");
function stateObjectMixin() {
    return class StateObjectImpl extends StateBase_1.stateBaseMixin(Object) {
        constructor(src) {
            super();
            this._isStateObject = true;
            this._backReferencesMap = {};
            this._proxifiedThis = createStateObjectProxy(this);
            this._update(src);
            return this._proxifiedThis;
        }
        _addBackReference(p, obj) {
            var _a, _b;
            (_a = this._backReferencesMap)[_b = p._propId] || (_a[_b] = []);
            this._backReferencesMap[p._propId].push(obj);
            return () => lodash_1.default.remove(this._backReferencesMap[p._propId], o => o === obj);
        }
        _backReferences(p) {
            return this._backReferencesMap[p._propId] || [];
        }
        _internalSet(key, val) {
            // let prev = (this as any)[key];
            this[key] = val;
        }
        _update(value) {
            const thisWithProxy = this._proxifiedThis;
            if (!thisWithProxy)
                throw new Error();
            for (let k in value)
                updateState_1.updateState(thisWithProxy, k, value[k]);
        }
    };
}
exports.stateObjectMixin = stateObjectMixin;
;
class AnyStateObject extends stateObjectMixin() {
}
;
function anyStateObject() {
    return new AnyStateObject({});
}
exports.anyStateObject = anyStateObject;
;
// class X {
//   test = 1;
//   xxx = "x";
// };
// const obj = new (stateObjectMixin(X));
// let t = obj._use("xxx")
function createStateObjectProxy(wrapped) {
    const proxy = new Proxy(wrapped, {
        get: (target, prop, receiver) => {
            let res = Reflect.get(target, prop);
            // if (res === "_use")
            //   return () => useNoboState(receiver);
            if (typeof res === "function")
                return res.bind(target);
            else {
                if (typeof prop == "string" && !prop.startsWith("_") && !(res === null || res === void 0 ? void 0 : res._isStateBase)) {
                    //   console.log("key acccess: ", prop);
                    autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: target, key: prop }, true);
                }
                if (res === null || res === void 0 ? void 0 : res._isStateReference) {
                    autorun_1.currentAutorunContext === null || autorun_1.currentAutorunContext === void 0 ? void 0 : autorun_1.currentAutorunContext.accesses.set({ state: res, key: null }, true);
                }
                return res; //Reflect.get(target, prop, receiver);
            }
            // return (receiver as any)[prop];
        },
        set: (target, prop, value, receiver) => {
            // console.log(' set ',  prop, ' to ', value);
            // console.log(' set ',  prop);
            if (prop.startsWith("_"))
                target[prop] = value;
            else
                autorun_1.autorunIgnore(() => updateState_1.updateState(receiver, prop, value));
            // (target as any)._set(prop, value);
            return true;
        },
    });
    wrapped._proxifiedThis = proxy;
    // (wrapped as any)._use = proxy;
    return proxy;
}
//# sourceMappingURL=StateObject.js.map