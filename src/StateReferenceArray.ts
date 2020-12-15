import _ from "lodash";
import { StateObjectArray } from "./array";
import { ReferenceSpec, PropSpec } from "./prop";
import { stateBaseMixin } from "./StateBaseClass";
import { StateObject } from "./StateObjectImpl";
import { HasId, IdType, StateTable } from "./StateTable";


export function stateReferenceArrayMixin<T extends HasId<any>>() {

  return class StateReferenceArray
    extends stateBaseMixin<StateObject<T>[], typeof Array>(Array) {

    _isStateReferenceArray = true;
    _toInitialize: (IdType<T> | T)[];
    _refsChangeListenersDispose = new Map<IdType<T>, (() => void)>();

    constructor(array: (IdType<T> | T)[]) {
      super();
      this._toInitialize = array;
    }

    _specs(): ReferenceSpec<any, any> {
      let specs = this._props as ReferenceSpec<any, any>;
      if (!specs) throw new Error();
      return specs;
    }

    _referencedTable(): StateTable<T> {
      let specs = this._specs();
      if (!specs || !specs._ref) throw new Error();
      return this._rootStateAccess(specs._ref._path);
    }


    _setProps(props: PropSpec) {
      super._setProps(props);

      this._parent._onDelete(() => {
        if (this._specs()._onThisDeleted === "cascade") {
          // remove refs when the parent stateobject is deleted.
          this.forEach(ref => (ref._parent as StateTable<T>).remove(ref.id));
        }
      });

      this.push(...this._toInitialize);
      this._toInitialize.length = 0;
    }

    remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[] {
      let removed = _.remove(this, filter);
      for (let o of removed) {
        let dispose = this._refsChangeListenersDispose.get(o.id);
        if (!dispose) throw new Error();
        dispose();
      }
      this._notifyThisSubscribers();
      return removed;
    }

    push(...elements: (IdType<T> | T)[]): number {

      elements.forEach(elt => {
        // Fixme undo.
        // this._getRootState()._history

        let ref: StateObject<T> | null = null;
        if ((elt as any)?.id !== undefined) {
          ref = this._referencedTable().insert(elt as T)
        }
        else {
          // Fixme, if id does not exists, it may be because it is not loaded in memory yet.
          ref = this._referencedTable().get(elt as IdType<T>) || null;
          if (!ref) throw new Error("StateReferenceArray error: trying to insert a non existing id " + elt);
        }

        // console.log("pus")
        super.push(ref);

        // Listen to change in ref.
        if (ref)
          this._refsChangeListenersDispose.set(ref.id, ref._onChange(() => this._notifyThisSubscribers()));

        // Setup on ref delete behaviors.
        ref?._onDelete(() => {
          let spec = this._specs();
          _.remove(this, r => r === ref);

          if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
            spec._onRefDeleted(this._parent, ref);
        });

        
      });
      
      if (elements.length)
        this._notifyThisSubscribers();

      return this.length;
    }
  }
}

export type StateReferenceArray<T> = {
  remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[]
} & StateObject<T>[];

export function stateReferenceArray<T extends HasId<any>>(elts: (T | IdType<T>)[]) : StateReferenceArray<T> {
  return new (stateReferenceArrayMixin())(elts) as any;
}