import _ from "lodash";
import { ReferenceSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { updateState } from "./updateState";


export function stateObjectMixin<T>() {

  return class StateObjectImpl extends stateBaseMixin<T, typeof Object>(Object)
  {
    _isStateObject = true;
    _removeListeners: ((o: T) => void)[] = [];
    #backReferencesMap: { [p: number]: any } = {}

    constructor(src: T) {
      super();
      this._update(src);
    }

    _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void {
      this.#backReferencesMap[p._propId] ||= [];
      this.#backReferencesMap[p._propId].push(obj);
      return () => _.remove(this.#backReferencesMap[p._propId], o => o === obj);
    }
    _backReferences<Parent>(p: ReferenceSpec<any, Parent>): Parent[] {
      return this.#backReferencesMap[p._propId] || [];
    }
 
    _onDelete(listener: (o: T) => void) {
      this._removeListeners.push(listener);
      return () => _.remove(this._removeListeners, l => l === listener);
    }

    _update(value: { [K in keyof T]?: T[K] }) {
      for (let k in value)
        updateState(this, k, value[k]);
    }

  }
};

class AnyStateObject extends stateObjectMixin<{}>() { };
export function anyStateObject() {
  return createProxy(new AnyStateObject({}));
}

export interface StateObjectInterface<T> extends StateBaseInterface<T> {
  _isStateObject: boolean;
  _removeListeners: ((o: T) => void)[];
  _onDelete(listener: (o: T) => void): () => void;
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

export function createProxy<T extends Object>(wrapped: T) {
  return new Proxy(wrapped, {
    get: (target, prop, receiver) => {
      let res = Reflect.get(target, prop);
      if (typeof res === "function")
        return res.bind(target);
      else
        return res;//Reflect.get(target, prop, receiver);
      // return (receiver as any)[prop];
    },
    set: (target, prop, value, receiver) => {
      if ((prop as string).startsWith("_"))
        (target as any)[prop as string] = value;
      else
        updateState(target, prop, value)
        // (target as any)._set(prop, value);
      return true;
    },
  });
}
