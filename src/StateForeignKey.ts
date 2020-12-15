import { ForeignKeySpec, PropSpec } from "./prop";
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
export class StateForeignKeyImpl<T extends HasId<any>>
  extends stateBaseMixin<{}, typeof Object>(Object) {

  _isStateForeignKey = true;

  _referencedObject: StateObject<T> | null = null;
  _disposeReferencedOnDelete: (() => void) | null = null;

  _refToInitialize: IdType<T> | T | null = null;

  constructor(idOrObj = null as IdType<T> | T | null) {
    super();
    this._refToInitialize = idOrObj;
  }

  _setProps(props: PropSpec) {
    super._setProps(props);
    
    this._parent._onDelete(() => {
      if (this._specs()._onThisDeleted === "cascade") {
        // remove ref when the parent stateobject is deleted.
        if (this._referencedObject)
          (this._referencedObject._parent as StateTable<T>).remove(this._referencedObject.id);
      }
    })
    this._set(this._refToInitialize);
    this._refToInitialize = null;
  }
  _specs(): ForeignKeySpec<any, any> {
    let specs = this._props as ForeignKeySpec<any, any>;
    if (!specs) throw new Error();
    return specs;
  }

  _referencedTable(): StateTable<T> {
    let specs = this._specs();
    if (!specs || !specs._ref) throw new Error();
    return this._rootStateAccess(specs._ref._path);
  }

  _set(idOrNewObj: IdType<T> | T | null) {

    // Stop listening to previous ref onDelete.
    this._disposeReferencedOnDelete?.();

    // Fixme undo.
    // this._getRootState()._history

    if ((idOrNewObj as any)?.id !== undefined) {
      this._referencedObject = this._referencedTable().insert(idOrNewObj as T);
    }
    else if (idOrNewObj !== null) {
      // Fixme, if id does not exists, it may be because it is not loaded in memory yet.
      this._referencedObject = this._referencedTable().get(idOrNewObj as IdType<T>) || null;
    }
    else {
      this._referencedObject = null;
    }

    // Set on delete behaviors.
    if (this._referencedObject) {
      this._disposeReferencedOnDelete = this._referencedObject._onDelete(() => {
        let spec = this._specs();
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

export class StateForeignKeyNotNullImpl<T extends HasId<any>>
  extends StateForeignKeyImpl<T> {

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


export function createForeignKeyProxy<T extends HasId<any>>(wrapped: StateForeignKeyImpl<T> | StateForeignKeyNotNullImpl<T>) {
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

export type StateForeignKey<T extends HasId<any>> = T & StateForeignKeyImpl<T>
export type StateForeignKeyNotNull<T extends HasId<any>> = T & StateForeignKeyNotNullImpl<T>
export function stateForeignKey<T extends HasId<any>>(id: IdType<T> | T | null) {
  return createForeignKeyProxy(new StateForeignKeyImpl<T>(id)) as any as StateForeignKey<T>;
}
export function stateForeignKeyNotNull<T extends HasId<any>>(id: IdType<T> | T) {
  return createForeignKeyProxy(new StateForeignKeyNotNullImpl<T>(id)) as any as StateForeignKeyNotNull<T>;
}
