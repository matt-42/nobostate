import { ReferenceSpec, PropSpec } from "./prop";
import { stateBaseMixin } from "./StateBase";
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
export class StateReferenceImpl<T extends HasId<any>>
  extends stateBaseMixin<{}, typeof Object>(Object) {

  _isStateReference = true;

  _referencedObject: StateObject<T> | null = null;
  _disposeRefOnDelete: (() => void) | null = null;
  _disposeRefOnChange: (() => void) | null = null;
  _disposeBackReference: (() => void) | null = null;

  _refToInitialize: IdType<T> | T | null = null;

  _previousSetArgument: IdType<T> | T | null = null;

  constructor(idOrObj = null as IdType<T> | T | null) {
    super();
    this._refToInitialize = idOrObj;
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
    this._set(this._refToInitialize);
    this._refToInitialize = null;
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
    if (this._referencedObject)
      (this._referencedObject._parent as StateTable<T>).remove(this._referencedObject.id);
  }

  _isNull() { return this._referencedObject === null; }

  _set(idOrNewObj: IdType<T> | T | null) {

    if (!this._getRootState()._history)
      throw new Error("Cannot set a reference on a object unattached to any root state.");

    // Stop listening to previous ref onDelete.
    this._disposeReference();

    // Do not record in history the insert/remove of the referenced object.
    this._getRootState()._history.ignore(() => {

      // remove the referenced object if it is owned.
      if (this._specs()._own) this._removeReferencedObject();

      if ((idOrNewObj as any)?.id !== undefined) {
        this._referencedObject = this._referencedTable().insert(idOrNewObj as T)
      }
      else if (idOrNewObj !== null) {
        this._referencedObject = this._referencedTable().get(idOrNewObj as IdType<T>) || null;
        if (!this._referencedObject)
          throw new Error("StateReferenceArray error: trying to reference a non existing id " + idOrNewObj);
      }
      else {
        this._referencedObject = null;
      }

    });

    if (this._referencedObject)
      this._disposeBackReference = this._referencedObject._addBackReference(this._specs(), this._parent);

    let prev = this._previousSetArgument;
    this._getRootState()._history.push({
      action: "anyAction",
      target: this,
      propId: this._props,
      undo: () => this._set(prev),
      redo: () => this._set(idOrNewObj)
    });
    this._previousSetArgument = idOrNewObj;

    // Listen to change in ref.
    if (this._referencedObject)
      this._disposeRefOnChange = this._referencedObject._onChange(() => this._notifyThisSubscribers());

    // Set on delete behaviors.
    if (this._referencedObject) {
      this._disposeRefOnDelete = this._referencedObject._onDelete(() => {
        let spec = this._specs();
        if (spec._onRefDeleted === "set-null") // SET NULL
          this._referencedObject = null;
        else if (spec._onRefDeleted === "cascade") // CASCADE
          (this._parent._parent as StateTable<T>).remove((this._parent as StateObject<T>).id)
        else if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
        {
          let prevRef = this._referencedObject;
          spec._onRefDeleted(this._parent, this._referencedObject);
          // the _onRefDeleted callback must update the ref. -> actually no, just set null if it did not.
          if (this._referencedObject === prevRef)
            this._set(null);
          // throw new Error(`Foreign key ${spec._path} error: onRefDelete callback did not update the outdated ref.`);
        }

      });
    }

    this._notifyThisSubscribers();

    // FIXME undo.
    // let history = this._getRootState()._history;
    // history.push({
    //   action: "updateProp",
    //   target: this,
    //   prop: "id",
    //   propId: (this._props as any)["id"],
    //   prev,
    //   next: id
    // } as HistoryUpdatePropAction);

  }
}

export class StateReferenceNotNullImpl<T extends HasId<any>>
  extends StateReferenceImpl<T> {

  constructor(idOrObj: IdType<T> | T) {
    super();
    this._set(idOrObj);
  }

  _set(idOrNewObj: IdType<T> | T) {
    super._set(idOrNewObj)
    if (!this._referencedObject)
      throw new Error("StateForeignNotNull::set resulted in a null reference.");
  }

}


export function createStateReferenceProxy<T extends HasId<any>>(wrapped: StateReferenceImpl<T> | StateReferenceNotNullImpl<T>) {
  return new Proxy(wrapped, {
    get: (target, prop, receiver) => {
      let res = Reflect.get(target, prop);
      if (typeof res === "function")
        return res.bind(target);
      else {
        let refProp = (target._referencedObject as any)?.[prop as string];
        if (refProp !== undefined)
          return refProp;
        else
          return res;
      }
    },
    set: (target, prop, value, receiver) => {
      let ref = target._referencedObject as any;
      let refProp = (target._referencedObject as any)?.[prop];

      if (refProp !== undefined && ref) {
        ref[prop] = value;
        return true;
      }
      else {
        if ((target as any)[prop] !== undefined) {
          (target as any)[prop] = value;
          return true;
        }
        else
          return false;
      }
      // (target as any)._set(prop, value);
      // return true;
    },
  });
}

export type StateReference<T extends HasId<any>> = T & StateReferenceImpl<T>
export type StateReferenceNotNull<T extends HasId<any>> = T & StateReferenceNotNullImpl<T>
export function stateReference<T extends HasId<any>>(id: IdType<T> | T | null) {
  return createStateReferenceProxy(new StateReferenceImpl<T>(id)) as any as StateReference<T>;
}
export function stateReferenceNotNull<T extends HasId<any>>(id: IdType<T> | T) {
  return createStateReferenceProxy(new StateReferenceNotNullImpl<T>(id)) as any as StateReferenceNotNull<T>;
}
