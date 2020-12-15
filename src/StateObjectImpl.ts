import _, { create } from "lodash";
import { useEffect, useState } from "react";
import { Constructor, StateBaseInterface, stateBaseMixin } from "./StateBaseClass";
import { updateState } from "./updateState";

export function useNoboState2(state: any, prop?: any) {

  const [, setRefreshToggle] = useState({});
  const [value, setValue] = useState(prop ? state._get(prop) : state);

  useEffect(() => {
    let listener = _.throttle(() => {
      setValue(prop ? state._get(prop) : state);
      setRefreshToggle({});
    }, 50);

    if (prop)
      return state._subscribe(prop, listener);

    else
      return state._subscribe(listener);

  }, []);
  return value;
}

// type Constructor<T = {}> = new (...args: any[]) => T;
// // type Constructor = new (...args: any[]) => {};


// export function baseMixin<Ctor extends Constructor<any>>(wrapped: Ctor) {

//   type ConstructorType<T> = T extends new (...args: any[]) => infer O ? O : never;
//   type W = ConstructorType<Ctor>;

//   type KeyAccessType<P> =
//     W extends (infer O)[] ? O :
//     W extends Array<infer O> ? O :
//     P extends keyof W ? W[P] : never;

//   type Keys =
//     W extends Array<any> ? number :
//     W extends any[] ? number :
//     keyof W;

//   return class Base extends wrapped {
//     _useSelector<R>(selector: (o: this) => R) {
//     }

//     _get<P extends Keys>(prop: P): KeyAccessType<P> { return (this as any)[prop]; }

//     // _subscribe(listener: Subscriber<StateObject<T>>): () => void;
//     _subscribe<K extends Keys>
//       (propOrId: K,
//         listener: (value: this, key: Keys) => void)
//       : () => void {
//       return () => { }
//     }
//     // _subscribe(arg1: any, arg2?: any): () => void { return this._subscribeImpl(arg1, arg2); }

//     _use(): this
//     _use<P extends Keys>(prop: P): KeyAccessType<P>
//     _use<P extends Keys>(prop?: P): KeyAccessType<P> | this {
//       const [, setRefreshToggle] = useState({});
//       const [value, setValue] = useState(prop ? this._get(prop) : this);

//       useEffect(() => {
//         let listener = _.throttle(() => {
//           setValue(prop ? this._get(prop) : this);
//           setRefreshToggle({});
//         }, 50);

//         if (prop)
//           return this._subscribe(prop, listener);
//         // else FIXME
//         //   return this._subscribe(listener);

//       }, []);
//       return value;
//     }

//   }
// }

// export function stateObjectMixin<W extends Constructor>(wrapped: W) {
//   return class StateObject extends baseMixin(wrapped) {
//     // _get<P extends keyof ConstructorType<W>>(prop: P): ConstructorType<W>[P] { return (this as ConstructorType<W>)[prop]; }
//     // _get<P extends WrappedKeys<ConstructorType<W>>>(prop: P): WrappedValue<ConstructorType<W>, P> { return (this as any)[prop]; }
//   }

// }

// // type ArrayValue<A> = A extends (infer T)[] ? T : never;

// function arrayM<W>(w: W): Constructor<W[]> { return Array; }

// // export function stateArrayMixin<E extends Constructor>(wrappedElement: E) {
// //   type ElementType =
// //     E extends new (...args: any[]) => infer O ? O : never;

// //   let wrapped = arrayM(wrappedElement);

// //   type W = typeof wrapped;
// //   type Ctor = new (...args: any[]) => Array<ElementType>;

// //   return class StateArray extends baseMixin<Ctor>(Array) {
// //     _get(prop: number): ElementType {
// //       // _get(prop: number) {
// //       return (this as any)[prop];
// //     }
// //   }

// // }

// export function stateArrayMixin<E>(ctor: new (...args: any[]) => E) {

//   let arrayCtor: Constructor<E[]> = Array;

//   return class StateArray extends baseMixin(arrayCtor) {
//     _get(prop: number): E {
//       return this[prop];
//     }
//   }

// }

// // type W = ConstructorType<new (...args: any) => { xxx: number }[]>;
// // type ElementType =
// //   W extends Array<infer E> ? E :
// //   W extends (infer E)[] ? E :
// //   { xxxx: number };

// // // type Ctor = new (...args: any[]) => Array<ElementType>;
// // type XXX = WrappedValue<ElementType[], number>;


// class X {
//   testNumber: number = 0;
//   testStr: string = "";
//   // constructor(x: number) {}
// }
// let XWrapped = stateObjectMixin(X);
// let x = new XWrapped();

// type K = ObjectPropsKeys<X>
// let n = x._get("testNumber");
// let n2 = x._get("testStr");
// let s = x._use("testNumber");
// let s2 = x._use("testStr");

// let YWrapped = stateArrayMixin(X);
// let y = new YWrapped();
// let y1 = y._get(1);
// let used = y._use(1);
// // x._subscribe()

// // x._get()
// // x._get()
// // x._get()
// // x._useSelector(o => {
// //   o.testNumber = 0;
// // })

export function stateObjectMixin<T>() {

  // type ConstructorType<C> = C extends new (...args: any[]) => infer O ? O : never;
  // type T = ConstructorType<Ctor>;

  return class StateObject extends stateBaseMixin<T, typeof Object>(Object)
  {
    _isStateObject = true;
    _removeListeners: ((o: T) => void)[] = [];

    constructor(src: T) {
      super();

      this._update(src);
      // for (let k in src) {
      //   (this as any)[k] = src[k];
      //   if ((src[k] as any)?._isStateBase)
      //     this._registerChild(k as any, (this as any)[k] as any);
      // }

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
  _removeListeners: ((o: T) => void)[];
  _onDelete(listener: (o: T) => void) : () => void;
  _update(value: { [K in keyof T]?: T[K] }): void;
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
        (target as any)._set(prop, value);
      return true;
    },
  });
}
