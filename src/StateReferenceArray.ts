import _ from "lodash";
import { StateObjectArray } from "./StateArray";
import { ReferenceSpec, PropSpec } from "./prop";
import { stateBaseMixin } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";


export function stateReferenceArrayMixin<T extends HasId<any>>() {

  return class StateReferenceArrayImpl
    extends stateBaseMixin<T[], typeof Array>(Array) {

    _isStateReferenceArray = true;
    _toInitialize: (IdType<T> | T)[];
    _refDisposers = new Map<IdType<T>, (() => void)[]>();

    constructor(array: (IdType<T> | T)[]) {
      super();
      this._toInitialize = array;
    }

    _specs(): ReferenceSpec<any, any> {
      let specs = this._props as any as ReferenceSpec<any, any>;
      if (!specs) throw new Error();
      return specs;
    }

    _referencedTable(): StateTable<T> {
      let specs = this._specs();
      if (!specs || !specs._ref) throw new Error();
      return this._rootStateAccess(specs._ref._path);
    }


    _setProps(props: PropSpec) {
      if ((props as ReferenceSpec<any, any>)._ref === undefined) {
        throw Error(`Unspecified reference array ${props._path.join('.')}:
        Use specs.referenceArray(props.${props._path.join('.')}, dstTable, options) to specify it.`);
      }

      super._setProps(props);

      this._parent._onDelete(() => {
        // dispose all refs.
        for (let disposers of this._refDisposers.values())
          disposers.forEach(f => f());

        if (this._specs()._own) {

          // remove refs when we own the ref and when the parent stateobject is deleted.
          this.forEach(ref => (ref._parent as StateTable<T>).remove(ref.id));
        }
      });

      this.push(...this._toInitialize);
      this._toInitialize.length = 0;
    }

    clear() {
      this.remove(() => true);
    }
    remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[] {
      let removed = _.remove(this, filter);
      for (let o of removed) {

        // dispose ref and clear disposers.
        let disposers = this._refDisposers.get(o.id);
        if (!disposers?.length) throw new Error();
        disposers.forEach(f => f());
        this._refDisposers.delete(o.id);

        // remove the refd object if we own it.
        if (this._specs()._own)
          (o._parent as StateTable<T>).remove(o.id)
      }
      this._notifyThisSubscribers();
      return removed;
    }

    push(...elements: (IdType<T> | T)[]): number {

      // insertion of all elements grouped makes 1 history group.
      this._getRootState()._history.group(() => {
        elements.forEach(elt => {

          let ref: StateObject<T> | null = null;
          if ((elt as any)?.id !== undefined) {
            this._getRootState()._history.ignore(() => {
              ref = this._referencedTable().insert(elt as T)
            });
          }
          else {
            ref = this._referencedTable().get(elt as IdType<T>) || null;
            if (!ref) throw new Error(`StateReferenceArray error: trying to insert a non existing id ${elt}`);
          }

          if (!ref) throw new Error();

          super.push(ref);

          this._getRootState()._history.push({
            action: "anyAction",
            target: this,
            propId: this._props,
            undo: () => this.remove(o => o.id === ref?.id),
            redo: () => this.push(elt)
          });

          // Init disposers.
          this._refDisposers.set(ref.id, []);
          let refDisposer = this._refDisposers.get(ref.id);
          if (!refDisposer) throw new Error();

          // Add the back reference.
          refDisposer.push(ref._addBackReference(this._specs(), this._parent));

          // Listen to change in ref.
          refDisposer.push(ref._onChange(() => this._notifyThisSubscribers()));

          // Setup on ref delete behaviors.
          refDisposer.push(ref._onDelete(() => {
            let spec = this._specs();
            _.remove(this, r => r === ref);

            if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
              spec._onRefDeleted(this._parent, ref);
          }));


        });
      });

      if (elements.length)
        this._notifyThisSubscribers();

      return this.length;
    }
  }
}

export type StateReferenceArray<T> = {
  _isStateReferenceArray: boolean;
  clear(): void;
  remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[];
  push(...elements: (IdType<T> | T)[]): number;

} & StateObject<T>[];

export function stateReferenceArray<T extends HasId<any>>(elts: (T | IdType<T>)[]): StateReferenceArray<T> {
  return new (stateReferenceArrayMixin())(elts) as any;
}