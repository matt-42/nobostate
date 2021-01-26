import _ from "lodash";
import { ReferenceSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { updateState } from "./updateState";


export function stateObjectMixin<T>() {

  return class StateObjectImpl extends stateBaseMixin<T, typeof Object>(Object)
  {
    _isStateObject = true;
    _removeListeners: ((o: T) => void)[] = [];
    _backReferencesMap: { [p: number]: any } = {}

    constructor(src: T) {
      super();
      this._update(src);
    }

    _addBackReference<Parent>(p: ReferenceSpec<any, Parent>, obj: Parent): () => void {
      this._backReferencesMap[p._propId] ||= [];
      this._backReferencesMap[p._propId].push(obj);
      return () => _.remove(this._backReferencesMap[p._propId], o => o === obj);
    }
    _backReferences<Parent>(p: ReferenceSpec<any, Parent>): Parent[] {
      return this._backReferencesMap[p._propId] || [];
    }
 
    _onDelete(listener: (o: T) => void) {
      this._removeListeners.push(listener);
      return () => _.remove(this._removeListeners, l => l === listener);
    }

    _update(value: { [K in keyof T]?: T[K] }) {
      for (let k in value)
        updateState(this, k, value[k]);
    }

    _registerChild(propOrId: any, child: any) {
      if ((child as any)._isStateBase) {
        let childBase = child as any;
        // when a child prop change.
        // we notify childs subscriber and the parent.
        childBase._parent = createStateObjectProxy(this);
        childBase._parentListener = () => {
          this._notifySubscribers(propOrId, child);
        };
      }
    }

  }
};

class AnyStateObject extends stateObjectMixin<{}>() { };
export function anyStateObject() {
  return createStateObjectProxy(new AnyStateObject({}));
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

export function createStateObjectProxy<T extends Object>(wrapped: T) {
  const proxy = new Proxy(wrapped, {
    get: (target, prop, receiver) => {
      let res = Reflect.get(target, prop);
      // if (res === "_use")
      //   return () => useNoboState(receiver);
      if (typeof res === "function")
        return res.bind(target);
      else
        return res;//Reflect.get(target, prop, receiver);
      // return (receiver as any)[prop];
    },
    set: (target, prop, value, receiver) => {
    // console.log(' set ',  prop, ' to ', value);
      if ((prop as string).startsWith("_"))
        (target as any)[prop as string] = value;
      else
        updateState(target, prop, value)
        // (target as any)._set(prop, value);
      return true;
    },
  });

  // (wrapped as any)._use = proxy;
  return proxy;
}
