import _ from "lodash";
import { ReferenceSpec, PropSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin, useNoboState } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";

// Nullable foreign key.
export class StateReference<T extends HasId<any>>
  extends stateBaseMixin<{}, typeof Object>(Object) {

  _isStateReference = true;

  _ref: StateObject<T> | null = null;

  get ref() { return this._ref; }

  _disposeRefOnDelete: (() => void) | null = null;
  _disposeRefOnChange: (() => void) | null = null;
  _disposeBackReference: (() => void) | null = null;

  _toInitialize: IdType<T> | T | null = null;

  _previousSetArgument: IdType<T> | T | null = null;

  _refListeners: ((ref: this) => void)[] = [];

  constructor(idOrObj = null as IdType<T> | T | StateObject<T> | null) {
    super();
    this._toInitialize = idOrObj;
  }

  _setProps(props: PropSpec) {
    if ((props as ReferenceSpec<any, any>)._ref === undefined) {
      throw Error(`Unspecified reference ${props._path.join('.')}:
      Use specs.reference(props.${props._path.join('.')}, dstTable, options) to specify it.`);
    }
    super._setProps(props);

    this._parent._onDelete(() => {

      if (this._specs()._own) {
        // remove ref when the parent stateobject is deleted.
        this._removeReferencedObject();
      }

      this._disposeReference();
    })
    this.set(this._toInitialize, false);
    this._toInitialize = null;
  }

  private _disposeReference() {
    this._disposeRefOnDelete?.();
    this._disposeRefOnChange?.();
    this._disposeBackReference?.();
    this._disposeBackReference = null;
    this._disposeRefOnDelete = null;
    this._disposeRefOnChange = null;
  }

  private _specs(): ReferenceSpec<any, any> {
    let specs = this._props as ReferenceSpec<any, any>;
    if (!specs) throw new Error();
    return specs;
  }

  private _referencedTable(): StateTable<T> {
    let specs = this._specs();
    if (!specs || !specs._ref) throw new Error();
    return this._rootStateAccess(specs._ref._path);
  }

  private _removeReferencedObject() {
    if (this._ref)
      (this._ref._parent as StateTable<T>).remove(this._ref.id);
  }

  _subscribeRef(listener: (ref: this) => void) {
    this._refListeners.push(listener);
    return () => {
      _.remove(this._refListeners, l => l === listener);
    };
  }

  set(idOrNewObj: IdType<T> | StateObject<T> | T | null, notify = true) {

    if (!this._getRootState()._history)
      throw new Error("Cannot set a reference on a object unattached to any root state.");

    // Stop listening to previous ref onDelete.
    this._disposeReference();

    // Do not record in history the insert/remove of the referenced object.
    this._getRootState()._history.ignore(() => {

      // remove the referenced object if it is owned.
      if (this._specs()._own) this._removeReferencedObject();

      if ((idOrNewObj as StateBaseInterface<any>)?._isStateBase) {
        this._ref = idOrNewObj as StateObject<T>;
        // If we will own the object check that is is not already owned. 
        if (this._specs()._own && this._ref._backReferences(this._specs()).length) {
          let owner = this._ref._backReferences(this._specs())[0];
          throw new Error(`Reference is already owned by ${owner._props._path.join('.')}[id == ${owner.id}]`);
        }
      }
      else if ((idOrNewObj as any)?.id !== undefined) {
        this._ref = this._referencedTable().insert(idOrNewObj as T)
      }
      else if (idOrNewObj !== null) {
        this._ref = this._referencedTable().get(idOrNewObj as IdType<T>) || null;
        if (!this._ref)
          throw new Error("StateReference error: trying to reference a non existing id " + idOrNewObj +
            `. reference : ${this._props._path.join('/')}. referenced table: ${this._referencedTable()._props._path.join("/")} `);
      }
      else {
        this._ref = null;
      }

    });

    if (this._ref)
      this._disposeBackReference = this._ref._addBackReference(this._specs(), this._parent);

    let prev = this._previousSetArgument;
    this._getRootState()._history.push({
      action: "anyAction",
      target: this,
      propId: this._props,
      undo: () => this.set(prev),
      redo: () => this.set(idOrNewObj)
    });
    this._previousSetArgument = idOrNewObj;

    // Listen to change in ref.
    if (this._ref)
      this._disposeRefOnChange = this._ref._onChange(() => this._notifyThisSubscribers());

    // Set on delete behaviors.
    if (this._ref) {
      this._disposeRefOnDelete = this._ref._onDelete(() => {
        let spec = this._specs();
        if (spec._onRefDeleted === "set-null") // SET NULL
          this._ref = null;
        else if (spec._onRefDeleted === "cascade") // CASCADE
          (this._parent._parent as StateTable<T>).remove((this._parent as StateObject<T>).id)
        else if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
        {
          let prevRef = this._ref;
          spec._onRefDeleted(this._parent, this._ref);
          // the _onRefDeleted callback must update the ref. -> actually no, just set null if it did not.
          if (this._ref === prevRef)
            this.set(null);
          // throw new Error(`Foreign key ${spec._path} error: onRefDelete callback did not update the outdated ref.`);
        }

      });
    }

    if (notify) {
      this._notifyThisSubscribers();
      this._refListeners.forEach(l => this._runNotification(l, this));
    }

  }
}

export class StateReferenceNotNullImpl<T extends HasId<any>>
  extends StateReference<T> {

  constructor(idOrObj: IdType<T> | T | StateObject<T>) {
    super(idOrObj);
  }

  set(idOrNewObj: IdType<T> | T | StateObject<T>) {
    super.set(idOrNewObj)
    if (!this._ref)
      throw new Error("StateReferenceNotNull::set resulted in a null reference.");
  }
}

export type StateReferenceNotNull<T extends HasId<any>> = { ref: StateObject<T> } & StateReferenceNotNullImpl<T>


export function stateReference<T extends HasId<any>>(id: IdType<T> | T | StateObject<T> | null) {
  return new StateReference<T>(id);
}
export function stateReferenceNotNull<T extends HasId<any>>(id: IdType<T> | T | StateObject<T>) {
  return new StateReferenceNotNullImpl<T>(id) as StateReferenceNotNull<T>;
}
export function nullStateReference(): StateReference<any> {
  return stateReference<any>(null);
}

export function useNoboRef<T extends HasId<any>>(state: StateReference<T>): StateReference<T>;
export function useNoboRef<T extends HasId<any>>(state: StateReferenceNotNull<T>): StateReferenceNotNull<T>;
export function useNoboRef<T extends HasId<any>>(state: any) : any {
  return useNoboState(state, "__ref__");
}
