import { ForeignKeySpec } from "./prop";
import { stateBaseMixin } from "./StateBaseClass";
import { StateObject } from "./StateObjectImpl";
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
export class StateForeignKey<T extends HasId<any>>
  extends stateBaseMixin<{}, typeof Object>(Object) {

  _isStateForeignKey = true;

  _referencedObject: StateObject<T> | null = null;
  _disposeReferencedOnDelete: (() => void) | null = null;

  constructor(idOrObj = null as IdType<T> | T | null) {
    super();
    this.set(idOrObj);
    this._parent._onDelete(() => {
      if (this.specs()._onThisDeleted === "cascade")
      {
        // remove ref when the parent stateobject is deleted.
        if (this._referencedObject)
          (this._referencedObject._parent as StateTable<T>).remove(this._referencedObject.id);
      }
    })
  }

  specs(): ForeignKeySpec<any, any, any> {
    let specs = this._props as ForeignKeySpec<any, any, any>;
    if (!specs) throw new Error();
    return specs;
  }

  referencedTable(): StateTable<T> {
    let specs = this.specs();
    if (!specs || !specs._ref) throw new Error();
    return this._rootStateAccess(specs._ref._path);
  }

  set(idOrNewObj: IdType<T> | T | null) {

    // Stop listening to previous ref onDelete.
    this._disposeReferencedOnDelete?.();

    // Fixme undo.
    // this._getRootState()._history

    if ((idOrNewObj as any)?.id == undefined) {
      this._referencedObject = this.referencedTable().insert(idOrNewObj as T);
    }
    else if (idOrNewObj !== null) {
      // Fixme, if id does not exists, it may be because it is not loaded in memory yet.
      this._referencedObject = this.referencedTable().get(idOrNewObj as IdType<T>) || null;
    }

    // Set on delete behaviors.
    if (this._referencedObject) {
      this._disposeReferencedOnDelete = this._referencedObject._onDelete(() => {
        let spec = this._props;
        if (spec._onRefDeleted === "set-null") // SET NULL
          this._referencedObject = null;
        else if (spec._onRefDeleted === "cascade") // CASCADE
          (this._parent._parent as StateTable<T>).remove((this._parent as StateObject<T>).id)
        else if (typeof spec._onRefDeleted === "function") // CUSTOM CALLBACK.
        {
          let prevRef = this._referencedObject;
          spec._onRefDeleted(this._parent, this._referencedObject);
          // the _onRefDeleted callback must update the ref.
          if (this._referencedObject === prevRef)
            throw new Error(`Foreign key ${spec._path} error: onRefDelete callback did not update the outdated ref.`);
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

export class StateForeignKeyNotNull<T extends HasId<any>>
  extends StateForeignKey<T> {

  constructor(idOrObj: IdType<T> | T) {
    super();
    this.set(idOrObj);
  }

  set(idOrNewObj: IdType<T> | T) {
    super.set(idOrNewObj)
    if (!this._referencedObject)
      throw new Error("StateForeignNotNull::set resulted in a null reference.");
  }

}