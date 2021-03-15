import _ from "lodash";
import { autorunIgnore, currentAutorunContext } from "./autorun";
import { ReferenceSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { updateState } from "./updateState";


export function stateObjectMixin<T>() {

  return class StateObjectImpl extends stateBaseMixin<T, typeof Object>(Object)
  {
    _isStateObject = true;
    _backReferencesMap: { [p: number]: any } = {}
    
    constructor(src: T) {
      super();
      this._proxifiedThis = createStateObjectProxy(this);
      this._update(src);
      return this._proxifiedThis;      
    }
    
    _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void {
      this._backReferencesMap[p._propId] ||= [];
      this._backReferencesMap[p._propId].push(obj);
      return () => _.remove(this._backReferencesMap[p._propId], o => o === obj);
    }
    _backReferences<Parent>(p: ReferenceSpec<any, Parent>): Parent[] {
      return this._backReferencesMap[p._propId] || [];
    }
    
    _internalSet<K extends keyof T>(key: K, val: T[K]) {
      // let prev = (this as any)[key];
      (this as any)[key] = val;
    }

    _update(value: { [K in keyof T]?: T[K] }) {
      const thisWithProxy = this._proxifiedThis;
      if (!thisWithProxy) throw new Error();
      for (let k in value)
        updateState(thisWithProxy, k, value[k]);
    }

  }
};

class AnyStateObject extends stateObjectMixin<{}>() { };
export function anyStateObject() {
  return new AnyStateObject({});
}

export interface StateObjectInterface<T> extends StateBaseInterface<T> {
  _isStateObject: boolean;
  _update(value: { [K in keyof T]?: T[K] }): void;

  _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void;
  _backReferences<Parent>(p: ReferenceSpec<any, Parent>): Parent[];

};

export type StateObject<T> = StateObjectInterface<T> & T;

// class X {
//   test = 1;
//   xxx = "x";
// };

// const obj = new (stateObjectMixin(X));
// let t = obj._use("xxx")

function createStateObjectProxy<T extends Object>(wrapped: T) {
  const proxy = new Proxy(wrapped, {
    get: (target, prop, receiver) => {
      let res = Reflect.get(target, prop);
      // if (res === "_use")
      //   return () => useNoboState(receiver);

      if (typeof res === "function")
        return res.bind(target);
      else {
        if (typeof prop == "string" &&  !(prop as string).startsWith("_") && !res?._isStateBase)
        {
          //   console.log("key acccess: ", prop);
          currentAutorunContext?.accesses.set({state: target as any, key: prop as string}, true);
        }
        if (res?._isStateReference) {
          currentAutorunContext?.accesses.set({state: res as any, key: null}, true);
        }
        return res;//Reflect.get(target, prop, receiver);
      }
      // return (receiver as any)[prop];
    },
    set: (target, prop, value, receiver) => {
      // console.log(' set ',  prop, ' to ', value);
      // console.log(' set ',  prop);
      if ((prop as string).startsWith("_"))
        (target as any)[prop as string] = value;
      else
        autorunIgnore(() => updateState(receiver, prop, value));
        // (target as any)._set(prop, value);
      return true;
    },
  });
  (wrapped as any)._proxifiedThis = proxy;
  // (wrapped as any)._use = proxy;
  return proxy;
}
