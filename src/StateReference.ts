import _ from "lodash";
import { PropSpec, ReferenceSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";

// Nullable foreign key.
function stateReferenceMixin<T extends HasId<any>>() {

  return class StateReferenceImpl extends stateBaseMixin<{ __stateReference__: T }, typeof Object>(Object)
  {

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

      this._parent._onDeleteInternal(() => {

        if (this._specs()._own) {
          // remove ref when the parent stateobject is deleted.
          this._removeReferencedObject(this._ref);
        }

        this._disposeReference();
      });

      // If ref is already initialized, skip initialization.
      if (!this._ref)
        this.set(this._toInitialize, false);
      // if (this._ref && this._toInitialize != this._ref)
      //   throw new Error("Error: reference::setProps: conflict between exiting ref and initialize value");
      this._toInitialize = null;
    }

    _disposeReference() {
      this._disposeRefOnDelete?.();
      this._disposeRefOnChange?.();
      this._disposeBackReference?.();
      this._disposeBackReference = null;
      this._disposeRefOnDelete = null;
      this._disposeRefOnChange = null;
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

    _removeReferencedObject(obj: StateObject<T> | null) {
      if (obj)
        (obj._parent as StateTable<T>).remove(obj.id);
    }

    _subscribeRef(listener: (ref: this) => void, initCall: boolean = false) {
      this._refListeners.push(listener);
      if (initCall) listener(this);
      return () => {
        _.remove(this._refListeners, l => l === listener);
      };
    }

    set(idOrNewObj: IdType<T> | StateObject<T> | T | null, notify = true) {

      this._logger()?.groupLog(`Set reference ${this._path()} to: `);
      this._logger()?.log(idOrNewObj);

      // console.log("SET REF ", this._path(), "to ", idOrNewObj);
      // console.trace();
      if (!this._getRootState()._history)
        throw new Error("Cannot set a reference on a object unattached to any root state.");

      // Stop listening to previous ref onDelete.
      this._disposeReference();

      // Do not record in history the insert/remove of the referenced object.
      this._getRootState()._history.group(() => {

        let previousRef = this._ref;

        if ((idOrNewObj as StateBaseInterface<any>)?._isStateBase) {
          this._ref = idOrNewObj as StateObject<T>;
          // If we will own the object check that is is not already owned. 
          if (this._specs()._own && this._ref._backReferences(this._specs()).length) {
            let owner = this._ref._backReferences(this._specs())[0];
            throw new Error(`Reference is already owned by ${owner._path()}`);
          }
        }
        else if ((idOrNewObj as any)?.id !== undefined) {
          this._ref = this._referencedTable().insert(idOrNewObj as T)
        }
        else if (idOrNewObj !== null) {
          this._ref = this._referencedTable().get(idOrNewObj as IdType<T>) || null;
          if (!this._ref)
            console.warn("StateReference error: trying to reference a non existing id " + idOrNewObj +
              `. reference : ${this._path()}. referenced table: ${this._referencedTable()._path()} `);
          // throw new Error("StateReference error: trying to reference a non existing id " + idOrNewObj +
          // `. reference : ${this._path()}. referenced table: ${this._referencedTable()._path()} `);
        }
        else {
          this._ref = null;
        }


        if (this._ref)
          this._disposeBackReference = this._ref._addBackReference(this._specs(), this._parent);

        // let prev = this._previousSetArgument;
        let currentRef = this._ref;
        this._getRootState()._history.push({
          action: "anyAction",
          target: this,
          propId: this._props,
          // undo: () => this.set(prev),
          // redo: () => this.set(idOrNewObj)
          undo: () => this.set(previousRef?.id || null),
          redo: () => {
            // console.log("REDO SET REF. set ref to ", currentRef?.id);
            this.set(currentRef?.id || null);
          }
          // undo: () => {
          //   console.log("UNDO SET REF. set ref to ", previousRef?.id, this._referencedTable().has(previousRef?.id as any));
          //    this._ref = previousRef ? this._referencedTable().get(previousRef.id) || null : null; },
          // redo: () => { this._ref = currentRef ? this._referencedTable().get(currentRef.id) || null : null; },
          // redo: () => this.set(this._ref?.id || null)

        });
        this._previousSetArgument = idOrNewObj;

        // remove the referenced object if it is owned.
        if (this._specs()._own && previousRef) this._removeReferencedObject(previousRef);

      });

      // Listen to change in ref.
      if (this._ref)
        this._disposeRefOnChange = this._ref._onChange(() => this._notifyThisSubscribers());

      // Set on delete behaviors.
      if (this._ref) {
        this._disposeRefOnDelete = this._ref._onDeleteInternal(() => {
          let spec = this._specs();
          if (spec._onRefDeleted === "set-null") // SET NULL
            this.set(null);
          else if (spec._onRefDeleted === "cascade") // CASCADE
          {
            this.set(null);
            (this._parent._parent as StateTable<T>).remove((this._parent as StateObject<T>).id)
          }
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

      if (this.ref)
        this._logger()?.log(`${this._path()} now references ${this._ref ? this._ref._path() : "null"}`);
      this._logger()?.groupEnd();
    }
  }
}

export function stateReferenceNotNullMixin<T extends HasId<any>>() {

  return class StateReferenceImpl extends stateReferenceMixin<T>()
  {
    constructor(idOrObj: IdType<T> | T | StateObject<T>) {
      super(idOrObj);
    }

    set(idOrNewObj: IdType<T> | T | StateObject<T>) {
      if (this._ref === null && idOrNewObj === null) return;

      super.set(idOrNewObj);
      // if (!this._ref && !this._parent?.__beingRemoved__)
      //   throw new Error(`StateReferenceNotNull::set resulted in a null reference: ${this._path()}`);
    }
  }
}

export type StateReference<T> = StateBaseInterface<T> & {
  _isStateReference: boolean;
  _toInitialize: IdType<T> | T | null;

  _subscribeRef(listener: (ref: StateReference<T>) => void, initCall?: boolean): () => void;
  set(idOrNewObj: IdType<T> | StateObject<T> | T | null, notify?: boolean): void;
  ref: StateObject<T> | null;
}
export type StateReferenceNotNull<T> = StateReference<T> & {
  _isStateReference: boolean;
  set(idOrNewObj: IdType<T> | StateObject<T> | T, notify?: boolean): void;
  ref: StateObject<T>;
}

export function stateReference<T extends HasId<any>>(id: IdType<T> | T | StateObject<T> | null) {
  return new (stateReferenceMixin<T>())(id) as any as StateReference<T>;
}
export function stateReferenceNotNull<T extends HasId<any>>(id: IdType<T> | T | StateObject<T>) {
  return new (stateReferenceNotNullMixin<T>())(id) as any as StateReferenceNotNull<T>;
}
export function nullStateReference(): StateReference<any> {
  return stateReference<any>(null);
}

