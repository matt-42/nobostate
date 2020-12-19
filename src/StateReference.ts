import { ReferenceSpec, PropSpec } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { StateObject } from "./StateObject";
import { HasId, IdType, StateTable } from "./StateTable";


// type FKGetReturnType<T, RefIdType> = RefIdType extends null ? T | null : T;


// let robot = stateObject({
//   id: -1,
//   frame: (stateReference, stateReferenceNotNull)<Frame>({
//     matrix: [0,1,2,3,4],

//   })
// }, {
//   setupSpecs: (props, specs) => {
//     specs.foreignKey(props.robots.frame, props.frames, {
//       nullable: true,
//       onRefRemoved: "cascade"|"set-null"|(_this : Robot, removed: Frame) => { },
//       onThisRemoved: "cascade",
//     })
//   }
// });

// robot.frame.matrix = [2,4,5];
// robot.frame._set(frameId|null);

// let staticObject = stateObject({
//   id: -1,
//   frames: stateManyReferences<Frame>([{
//     matrix: [0,1,2,3,4],
//   }])
// }, {
//   setupSpecs: (props, specs) => {
//     specs.manyReferences(props.robots.frame, props.frames, {
//       onRefRemoved: "cascade"|"set-null"|(_this : Robot, removed: Frame) => { },
//       onThisRemoved: "cascade",
//     })
//   }
// });

// object.frames[1]._push({id: -1, ...});
// object.frames[1]._remove(f => f.id === 42);

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
    this.set(this._toInitialize);
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

  _removeReferencedObject() {
    if (this._ref)
      (this._ref._parent as StateTable<T>).remove(this._ref.id);
  }

  set(idOrNewObj: IdType<T> | StateObject<T> | T | null) {

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
        if (this._specs()._own && this._ref._backReferences(this._specs()).length)
        {
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
          throw new Error("StateReferenceArray error: trying to reference a non existing id " + idOrNewObj);
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

    this._notifyThisSubscribers();


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
      throw new Error("StateForeignNotNull::set resulted in a null reference.");
  }
 }

export type StateReferenceNotNull<T extends HasId<any>> = {ref : StateObject<T>} & StateReferenceNotNullImpl<T>


export function stateReference<T extends HasId<any>>(id: IdType<T> | T | StateObject<T> | null) {
  return new StateReference<T>(id);
}
export function stateReferenceNotNull<T extends HasId<any>>(id: IdType<T> | T | StateObject<T>) {
  return new StateReferenceNotNullImpl<T>(id) as StateReferenceNotNull<T>;
}
export function nullStateReference() : StateReference<any> {
  return stateReference<any>(null);
}