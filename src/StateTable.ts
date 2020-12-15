import _ from "lodash";
import { StateArray } from "./array";
import { HistoryTableAction } from "./history";
import { stateObject } from "./nobostate";
import { propagatePropIds, TablePropSpec } from "./prop";
import { Constructor, StateBaseInterface, stateBaseMixin } from "./StateBaseClass";
import { StateForeignKey } from "./StateForeignKey";
import { anyStateObject, StateObject, stateObjectMixin } from "./StateObjectImpl";
import { unwrapState, revive } from "./unwrap_revive";
import { updateState } from "./updateState";



export interface HasId<T> { id: T; };
export type IdType<T> = T extends HasId<infer I> ? I : string;

export function stateTableMixin<T extends HasId<T>>() {

  // const m = new Map<IdType<T>, T>()

  type Id = IdType<T>;
  type MapType = Map<Id, StateObject<T>>;

  return class StateTableImpl extends stateBaseMixin<Map<Id, StateObject<T>>, typeof Map>(Map) {

    _isStateTable = true;
    _useIds() { return this._useSelector(table => [...table.keys()]); }
    ids() { return [...this.keys()]; }

    map<R>(f: (o: StateObject<T>) => R) { return [...this.values()].map(f); }
    flatMap<R>(f: (o: StateObject<T>) => R[]) { return [...this.values()].flatMap(f); }
    find(predicate: (o: StateObject<T>) => boolean) { return [...this.values()].find(predicate); }

    // _removeListeners = new Map<Id, (o : O) => void>();
    // onRemove(id: Id, listener: (o : O) => void) {
    //   this.assertGet(id)._removeListeners.push(listener);
    // }

    _insertListeners: ((o: StateObject<T>) => void)[] = [];
    onInsert(listener: (o: StateObject<T>) => void): () => void {
      this._insertListeners.push(listener);
      return () => _.remove(this._insertListeners, l => l === listener);
    }

    attach(fun: (o: StateObject<T>) => (() => void) | void) {
      this.onInsert(object => {
        let dispose = fun(object);
        if (dispose)
          object._removeListeners.push(dispose);
      })
    }

    insert(value: T): this {
      let elt = anyStateObject() as any as StateObject<T>;
      elt = _.assign(elt, value);

      propagatePropIds(elt, this._props);
      let id = (elt as any).id;
      this._registerChild(id, elt);
      super.set(id, elt);
      this._notifySubscribers(id, elt);
      // console.log(this._getRootState());
      // console.log(this._getRootState()._history);
      this._insertListeners.forEach(f => f(elt));

      const history = this._getRootState()._history;
      if (history && this._props)
        history.push({
          action: "insert",
          propId: this._props,
          target: this,
          element: elt
        } as HistoryTableAction);
      return this;
    }

    clone(id: Id) {

      let obj = this.assertGet(id);

      // find a new unique id.
      let toIdType = typeof obj.id === "number" ? (i: number) => i : (i: number) => i.toString();
      let i = this.size;
      while (this.has(toIdType(i) as Id))
        i++;
      let newId = toIdType(i);

      let clone: any = unwrapState(obj);
      clone._stateObject.id = newId;
      // console.log(clone);
      let bind = revive(clone) as StateObject<T>;
      this.insert(bind);
      return bind as StateObject<T>;
    }

    set(id: Id, value: StateObject<T>): this {
      if (!this.has(id))
        return this.insert(value);
      else
        return this._set(id, value);
    }

    assertGet(id: Id) {
      let res = this.get(id);
      if (!res)
        throw new Error(`StateTable get error: id ${id.toString()} does not exists`);
      return res;
    }

    _get(id: Id) {
      return this.assertGet(id);
    }

    _set(id: Id, val: StateObject<T>): this {
      if (this.has(id))
        updateState(this, id, val);
      else
        this.insert(val);
      return this;
    }

    remove(id: Id) {
      let eltToDelete = this.assertGet(id);
      eltToDelete._removeListeners.forEach((f: any) => f(eltToDelete));

      this._thisSubscribers.forEach(f => f(this, id));
      this._parentListener?.();

      // this._insertListeners.forEach(f => f(eltToDelete._wrapped));
      this.delete(id);

      // Manage foreign keys.
      for (let c of (this._props as TablePropSpec<any>)._foreignKeys) {
        let { srcProp, trigger } = c;
        let tablePath = [...srcProp._path];
        let key = tablePath.pop();

        if (!key) {
          throw new Error(`Foreign key path is empty`);
        }
        let table = this._rootStateAccess(tablePath) as StateTable<any> | StateArray<any>;
        if (!table.forEach)
          throw new Error(`Foreign key ref ${tablePath.join(".")} is not a table or an array`);

        let toRemove: any[] = [];
        table.forEach((elt: any) => {
          let ref = elt[key as string] as StateForeignKey<any>;
          if (ref.getId() === id) {
            if (trigger === "cascade")
              toRemove.push(elt.id);
            else if (trigger === "set-null")
              ref.set(null);

            else//Get
              trigger(elt, eltToDelete);
          }
        });
        for (let id of toRemove)
          table.remove(id);
      }

      this._getRootState()._history.push({
        action: "remove",
        propId: this._props,
        target: this,
        element: eltToDelete
      } as HistoryTableAction);
    }

    _useMapSelector<R>(mapSelector: (o: StateObject<T>) => R) {
      return this._useSelector(table => [...table.values()].map(mapSelector));
    }
  }
}



export interface StateTableInterface<T> extends StateBaseInterface<Map<IdType<T>, StateObject<T>>> {

  _useIds(): IdType<T>[];
  ids(): IdType<T>[];

  map<R>(f: (o: StateObject<T>) => R): R[];

  flatMap<R>(f: (o: StateObject<T>) => R[]): R[];
  find(predicate: (o: StateObject<T>) => boolean): StateObject<T>;


  _insertListeners: ((o: StateObject<T>) => void)[];
  onInsert(listener: (o: StateObject<T>) => void): () => void;

  attach(fun: (o: StateObject<T>) => (() => void) | void): void;

  insert(elt: T): this;

  clone(id: IdType<T>): StateObject<T>;
  set(id: IdType<T>, value: StateObject<T>): this;

  assertGet(id: IdType<T>): StateObject<T>;

  _get(id: IdType<T>): StateObject<T>;

  _set(id: IdType<T>, val: StateObject<T>): this;

  remove(id: IdType<T>): void;
  _useMapSelector<R>(mapSelector: (o: StateObject<T>) => R): R[];
}

export type StateTable<T> = StateTableInterface<T> & Map<IdType<T>, StateObject<T>>; 