import { HistoryUpdatePropAction } from "./history";
import { PropSpec, ForeignKeySpec, TablePropSpec } from "./prop";
import { stateBaseMixin } from "./StateBaseClass";
import { StateObject } from "./StateObjectImpl";
import { HasId, IdType, StateTable } from "./StateTable";


type FKGetReturnType<T, RefIdType> = RefIdType extends null ? T | null : T;

export class StateForeignKey<T extends HasId<any>, RefIdType = IdType<T> | null>
  extends stateBaseMixin<{}, typeof Object>(Object) {
  _isStateForeignKey = true;
  _id: RefIdType;

  constructor(id: RefIdType) {
    super();
    this._id = id;
  }

  private referencedTable() : TablePropSpec<any> {
    let specs = this._props as ForeignKeySpec<T, RefIdType, any>;
    if (!specs || !specs._ref) throw new Error();
    return specs._ref;
  }
  
  getId() { return this._id; }
  assertGet(): StateObject<T> {
    return this._rootStateAccess(this.referencedTable()._path).assertGet(this._id);
  }

  get(): FKGetReturnType<T, RefIdType> {
    let specs = this._props as ForeignKeySpec<T, RefIdType, any>;
    if (!specs || !specs._ref) throw new Error();

    let res = this._id === null ? null :
      (this._rootStateAccess(specs._ref._path) as StateTable<T>).assertGet(this._id as IdType<T>);
    return res as FKGetReturnType<T, RefIdType>;

  }

  set(id: RefIdType) {
    let prev = this._id;
    this._id = id;
    this._notifySubscribers("id" as never, id as never);

    let history = this._getRootState()._history;
    history.push({
      action: "updateProp",
      target: this,
      prop: "id",
      propId: (this._props as any)["id"],
      prev,
      next: id
    } as HistoryUpdatePropAction);

  }
}
