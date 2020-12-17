import _ from "lodash";
import { StateArray } from "./StateArray";
import { HistoryTableAction } from "./history";
import { stateObject } from "./nobostate";
import { propagatePropIds, TablePropSpec } from "./prop";
import { stateBaseMixin, StateBaseInterface } from "./StateBase";
import { StateObject, anyStateObject } from "./StateObject";
import { StateReference } from "./StateReference";
import { unwrapState, revive } from "./unwrap_revive";
import { updateState } from "./updateState";



export interface HasId<T> { id: T; };
export type IdType<T> = T extends HasId<infer I> ? I : string;

interface NewIntId { _isNewIntId: boolean };
interface NewStringId { _isNewStringId: boolean };
export function newIntId(): number { return { _isNewIntId: true } as any; }
export function newStringId(): string { return { _isNewStringId: true } as any; }

export function stateTableMixin<T extends HasId<any>>() {

  // const m = new Map<IdType<T>, T>()

  type Id = IdType<T>;
  type MapType = Map<Id, StateObject<T>>;

  return class StateTableImpl extends stateBaseMixin<MapType, typeof Map>(Map) {

    _isStateTable = true;
    _lastInsertId: IdType<T> | null = null;

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

    insert(value: T): StateObject<T> {

      let insert_code = () => {

        // Compute new id if needed.
        if ((value.id as any as NewIntId)._isNewIntId === true) {
          let id = this._lastInsertId || 1;
          while (this.has(id)) id++;
          value = {...value, id};
        }
        if ((value.id as any as NewStringId)._isNewStringId === true) {
          let id = parseInt(this._lastInsertId || "1");
          while (this.has(id.toString())) id++;
          value = {...value, id: id.toString() };
        }

        if (this.has(value.id))
          throw new Error(`table ${this._props._path.join('.')} with id ${value.id} already exists`);
        let elt = anyStateObject() as any as StateObject<T>;
        elt._update(value);

        let id = elt.id;
        this._registerChild(id, elt);
        propagatePropIds(elt, this._props);

        super.set(id, elt);
        this._lastInsertId = id;
        this._notifySubscribers(id, elt);
        // console.log(this._getRootState());
        // console.log(this._getRootState()._history);
        [...this._insertListeners].forEach(f => f(elt));

        const history = this._getRootState()._history;
        if (history && this._props)
          history.push({
            action: "insert",
            propId: this._props,
            target: this as any,
            element: elt
          } as HistoryTableAction);

        return elt;

      }

      if (this._getRootState()._history)
        return this._getRootState()._history.group(insert_code);
      else return insert_code();
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
      // if (!this.has(id))
      //   return this.insert(value as any as T);
      // else
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
      // Group all actions related to 1 remove.
      this._getRootState()._history.group(`remove-${this._props._path.join('-')}-${id}`, () => {

        let eltToDelete = this.assertGet(id);
        // call the on delete listeners.
        // clone the array because listeners can remove themselves from the array, breaking foreack.
        [...eltToDelete._removeListeners].forEach((f: any) => f(eltToDelete));

        [...this._thisSubscribers].forEach(f => f(this, id));
        this._parentListener?.();

        // this._insertListeners.forEach(f => f(eltToDelete._wrapped));
        this.delete(id);

        this._getRootState()._history.push({
          action: "remove",
          propId: this._props,
          target: this as any,
          element: eltToDelete
        } as HistoryTableAction);
      });
    }

    _useMapSelector<R>(mapSelector: (o: StateObject<T>) => R) {
      return this._useSelector(table => [...table.values()].map(mapSelector));
    }
  }
}



export interface StateTableInterface<T> extends StateBaseInterface<Map<IdType<T>, StateObject<T>>> {

  _isStateTable: boolean;

  _useIds(): IdType<T>[];
  ids(): IdType<T>[];

  map<R>(f: (o: StateObject<T>) => R): R[];

  flatMap<R>(f: (o: StateObject<T>) => R[]): R[];
  find(predicate: (o: StateObject<T>) => boolean): StateObject<T>;


  _insertListeners: ((o: StateObject<T>) => void)[];
  onInsert(listener: (o: StateObject<T>) => void): () => void;

  attach(fun: (o: StateObject<T>) => (() => void) | void): void;

  insert(elt: T): StateObject<T>;

  clone(id: IdType<T>): StateObject<T>;
  set(id: IdType<T>, value: StateObject<T>): this;

  assertGet(id: IdType<T>): StateObject<T>;

  _get(id: IdType<T>): StateObject<T>;

  _set(id: IdType<T>, val: StateObject<T>): this;

  remove(id: IdType<T>): void;
  _useMapSelector<R>(mapSelector: (o: StateObject<T>) => R): R[];
}

export type StateTable<T> = StateTableInterface<T> & Map<IdType<T>, StateObject<T>>; 