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

    constructor(array?: (IdType<T> | T)[]) {
      super();
      this._toInitialize = array || [];
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


      this._parent._onDeleteInternal(() => {

        if (this._specs()._own) {
          // console.log(this);
          // remove refs when we own the ref and when the parent stateobject is deleted.

          while (this.length)
            (this[0]._parent as StateTable<T>).remove(this[0].id);

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
    remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[] {
      let indicesToRemove: number[] = [];
      this.forEach((val, idx) => { if (filter(val)) indicesToRemove.push(idx); });

      const elementsRemoved : StateObject<T>[] = []
      indicesToRemove.forEach((index, indexPosition) => {
        
        
        let actualIndex = index - indexPosition;
        let o = this.splice(actualIndex, 1)[0] as StateObject<T>;
        if (!o) throw new Error();
        
        this._logger()?.groupLog(`Remove id ${o.id} from reference Array ${this._path()}`);

        elementsRemoved.push(o);
        this._getRootState()._history.push({
          action: "anyAction",
          target: this,
          propId: this._props,
          undo: () => this.insert(o, actualIndex),
          redo: () => this.remove(x => x.id === o.id),
        });


        // dispose ref and clear disposers.
        let disposers = this._refDisposers.get(o.id);
        if (!disposers?.length) throw new Error();
        if (disposers) {
          disposers.forEach(f => f());
          this._refDisposers.delete(o.id);
        }

        // remove the refd object if we own it.
        if (this._specs()._own)
          (o._parent as StateTable<T>).remove(o.id);

        this._logger()?.groupEnd();
      });
      this._notifyThisSubscribers();
      return elementsRemoved;
    }

    insert(elt: IdType<T> | T | StateObject<T>, index: number) {

      this._logger()?.groupLog(`Insert into reference Array ${this._path()} at position ${index}: `);
      this._logger()?.log(elt);

      if (Array.isArray(elt))
        throw new Error("type error: referenceArray::push takes elements, not array. Use push(...array) instead.");
      let ref: StateObject<T> | null = null;
      if ((elt as StateObject<T>)._isStateBase) {
        ref = elt as StateObject<T>;
        if (!this._referencedTable().has(ref.id))
          this._referencedTable().insert(ref as StateObject<T>);
      }
      else if ((elt as any)?.id !== undefined) {
        ref = this._referencedTable().insert(elt as T);
      }
      else {
        ref = this._referencedTable().get(elt as IdType<T>) || null;
        if (!ref) throw new Error(`StateReferenceArray error: trying to create a ref to the non existing id ${elt} 
          of table '${this._referencedTable()._path()}`);
      }

      if (!ref) throw new Error();

      super.splice(index, 0, ref);

      this._getRootState()._history.push({
        action: "anyAction",
        target: this,
        propId: this._props,
        undo: () => this.remove(o => o.id === ref?.id),
        redo: () => { if (ref) this.push(ref); }
      });

      // Init disposers.
      this._refDisposers.set(ref.id, []);
      let refDisposer = this._refDisposers.get(ref.id);
      if (!refDisposer) throw new Error();

      // Add the back reference.
      refDisposer.push(ref._addBackReference(this._specs(), this._parent));

      // Listen to change in ref.
      // Actually no, do not forward notifications. let the user decide with ref he want to listen to.
      // Forwarding changes in ref lead to too many unneeded notifications.
      // refDisposer.push(ref._onChange(() => this._notifyThisSubscribers()));

      // Setup on ref delete behaviors.
      refDisposer.push(ref._onDeleteInternal(() => {
        let spec = this._specs();
        this.remove(r => r === ref);

        if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
          spec._onRefDeleted(this._parent, ref);
      }));

      this._logger()?.groupEnd();
    }

    push(...elements: (IdType<T> | T | StateObject<T>)[]): number {

      // insertion of all elements grouped makes 1 history group.
      this._getRootState()._history.group(() => {
        elements.forEach(elt => {
          this.insert(elt, this.length);
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
  _toInitialize: (IdType<T> | T)[];
  clear(): void;
  remove(filter: (o: StateObject<T>) => boolean): StateObject<T>[];
  push(...elements: (IdType<T> | T | StateObject<T>)[]): number;

} & StateObjectArray<T>;

export function stateReferenceArray<T extends HasId<any>>(elts?: (T | IdType<T>)[]): StateReferenceArray<T> {
  return new (stateReferenceArrayMixin())(elts) as any;
}