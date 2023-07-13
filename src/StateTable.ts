import _ from "lodash";
import { autorun, autorunIgnore, currentAutorunContext } from "./autorun";
import { HistoryTableAction } from "./history";
import { propagatePropIds } from "./prop";
import { StateBaseInterface, stateBaseMixin } from "./StateBase";
import { anyStateObject, StateObject } from "./StateObject";
import { revive, unwrapState } from "./unwrap_revive";
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


    _keyDeleteListeners: (() => void)[] = [];
    onKeyDelete(listener: () => void): () => void {
      this._keyDeleteListeners.push(listener);
      return () => _.remove(this._keyDeleteListeners, l => l === listener);
    }

    ids() { 
      currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
      return [...this.keys()]; 
    }

    _subscribeIds(listener: (ids: IdType<T>[]) => void) {
      let disposers = [
        this.onInsert(() => listener(this.ids())),
        this.onKeyDelete(() => listener(this.ids()))
      ];
      return () => disposers.forEach(f => f());
    }

    map<R>(f: (o: StateObject<T>) => R) {
      currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
      return [...this.values()].map(f);
    }
    flatMap<R>(f: (o: StateObject<T>) => R[]) {
      currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
      return [...this.values()].flatMap(f);
    }
    find(predicate: (o: StateObject<T>) => boolean) {
      currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
      return [...this.values()].find(predicate);
    }
    values() {
      currentAutorunContext?.accesses.set({ state: this as any, key: null }, true);
      return super.values();
    }
    // _removeListeners = new Map<Id, (o : O) => void>();
    // onRemove(id: Id, listener: (o : O) => void) {
    //   this.assertGet(id)._removeListeners.push(listener);
    // }

    _insertListeners: ((o: StateObject<T>) => void)[] = [];
    onInsert(listener: (o: StateObject<T>) => void): () => void {
      // Fixme remove onInsertInternal, seems like it's useless.
      // const ignoredListener = listener;//(o: StateObject<T>) => this._getRootState()._history.ignore(() => listener(o));

      const ignoredListener = (o: StateObject<T>) => { if (!(o as any).__removed__) listener(o); };

      this._insertListeners.push(ignoredListener);
      return () => _.remove(this._insertListeners, l => l === ignoredListener);
    }

    onInsertInternal(listener: (o: StateObject<T>) => void): () => void {
      this._insertListeners.push(listener);
      return () => _.remove(this._insertListeners, l => l === listener);
    }

    attach(fun: (o: StateObject<T>) => (() => void) | undefined) {
      let disposed = false;

      const onRemoveDisposers = [] as (() => void)[];
      const attachToObject = (object: StateObject<T>) => {
        let onRemove = fun(object);
        if (onRemove) {
          // on detach, unsubscribe to onDelete and call the onRemove callback.
          onRemoveDisposers.push(object._onRemove(() => {
            if (!disposed && onRemove) {
              onRemove();
              _.remove(onRemoveDisposers, f => f === onRemove);
            }
          }));
          onRemoveDisposers.push(onRemove);
        }
      }

      let disposeOnInsert = this.onInsert(attachToObject);

      for (let obj of this.values())
        attachToObject(obj);

      return () => { disposeOnInsert(); onRemoveDisposers.forEach(f => f()); disposed = true; }
    }

    insert(value: T | StateObject<T>): StateObject<T> {

      const run = this._getRootState()?._transaction || (<R>(x: () => R) => { return x(); });
      const run2 = (<R>(x: () => R) => { return autorunIgnore(() => run(x)) })
      return run2(() => {


        let insert_code = () => {
          // Compute new id if needed.
          if ((value.id as any as NewIntId)._isNewIntId === true) {
            let id = (this._lastInsertId || 0) + 1;
            while (this.has(id)) id++;
            value = { ...value, id };
          }
          if ((value.id as any as NewStringId)._isNewStringId === true) {
            let id = parseInt(this._lastInsertId || "0") + 1;
            while (this.has(id.toString())) id++;
            value = { ...value, id: id.toString() };
          }

          // check if id already exists.
          if (this.has(value.id))
            throw new Error(`table ${this._path()} with id ${value.id} already exists`);

          // Insert a new placeholder stateObject in the map.
          // if value is already a state object, insert it directly.
          let valueIsAlreadyAStateObject = (value as StateObject<T>)._isStateObject;
          let elt = (valueIsAlreadyAStateObject ? value : anyStateObject() as any) as StateObject<T>;
          super.set(value.id, elt);

          // console.log(`${this._props?._path.join('/')}: insert id`, value.id);

          // Update the placeholder with the new element attributes.
          // updateState(this, value.id, value);
          if (!valueIsAlreadyAStateObject)
            autorunIgnore(() => elt._update(value));

          let id = elt.id;
          this._registerChild(id, elt);
          propagatePropIds(elt, this._props);

          this._lastInsertId = id;
          
          this._notifySubscribers(id, elt);
          
          // console.log(this._getRootState());
          // console.log(this._getRootState()._history);
          if (this._insertListeners.length) {
            this._logger()?.groupLog(`Calling onInsert listeners for ${this._path()}`);
            // [...this._insertListeners].forEach(f => this._runNotification(f, elt));
            this._runNotification(this._insertListeners, elt);
            this._logger()?.groupEnd();
          }

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


        this._logger()?.groupLog(`Insert in table ${this._path()} element: `);
        // if ((value as StateObject<T>)._isStateObject)
        //   this._logger()?.log(`stateObject with id ${value.id}`);
        this._logger()?.log(value);

        let res = this._getRootStateHistory()?.group(insert_code) || insert_code();

        this._logger()?.groupEnd();
        return res;
      });

    }

    clone(id: Id, newId_?: Id) {

      let obj = this.assertGet(id);

      let newId = newId_ as Id;
      if (!newId) {

        // find a new unique id.
        let toIdType = typeof obj.id === "number" ? (i: number) => i : (i: number) => i.toString();
        let i = this.size;
        while (this.has(toIdType(i) as Id))
          i++;
        newId = toIdType(i) as Id;
      }

      let clone: any = unwrapState(obj);
      clone._stateObject.id = newId;
      // console.log(clone);
      let bind = revive(clone) as StateObject<T>;
      this.insert(bind);
      return bind as StateObject<T>;
    }

    set(id: Id, value: StateObject<T>) {
      // if (!this.has(id))
      //   return this.insert(value as any as T);
      // else
      return this._set(id, value);
    }

    assertGet(id: Id) {
      let res = this.get(id);
      if (!res)
        throw new Error(`StateTable get error: id ${id.toString()} does not exists in table ${this._props._path?.join('/')}`);
      return res;
    }

    _get(id: Id) {
      return this.assertGet(id);
    }

    _set(id: Id, val: StateObject<T>) {
      if (this.has(id))
        updateState(this, id, val);
      else
        this.insert(val);
      return this;
    }

    clear() {
      while (this.size)
        for (let id of this.keys()) {
          if (this.has(id))
            this.remove(id);
        }
    }
    remove(id: Id) {
      autorunIgnore(() => {

        // console.trace();
        let root = this._getRootState();
        let eltToDelete = this.get(id);
        if (!eltToDelete) return;

        // Avoid infinit loop when own == true and onRefDeleted == cascade.
        if (eltToDelete.__beingRemoved__) return;
        eltToDelete.__beingRemoved__ = true;
        // console.log("remove ", `remove-${this._path()}-${id}`, this.has(id), this.get(id)?.__beingRemoved__);

        this._logger()?.groupLog(`Remove ${eltToDelete._path()}`);

        if (eltToDelete._beforeRemoveListeners.length) {
          this._logger()?.groupLog(`Calling onRemove listeners of ${eltToDelete._path()}`);
          [...eltToDelete._beforeRemoveListeners].forEach((f: any) => f(eltToDelete));
          eltToDelete._beforeRemoveListeners.length = 0;
          this._logger()?.groupEnd();
        }

        // console.trace();
        // Use a transaction so that no listeners is called in the middle of the removal.
        root._transaction(() => {

          // Group all actions related to 1 remove.
          root._history.group(() => {

            // this._insertListeners.forEach(f => f(eltToDelete._wrapped));

            // call the on delete listeners.
            // clone the array because listeners can remove themselves from the array, breaking foreach.

            // [...eltToDelete._removeListeners].forEach((f: any) => this._runNotification(f, eltToDelete));

            if (eltToDelete._removeListeners.length) {
              this._logger()?.groupLog(`Calling onRemove listeners of ${eltToDelete._path()}`);
              [...eltToDelete._removeListeners].forEach((f: any) => f(eltToDelete));
              eltToDelete._removeListeners.length = 0;
              this._logger()?.groupEnd();
            }


            // Then we remove the element from the table.
            // Note: we must do it after removelisteners because they may need to retreive info
            // about the element being removed.
            if (!this.delete(id))
              throw new Error();
            this._logger()?.log(`Deleted ${eltToDelete._path()}`);

            this._keyDeleteListeners.forEach(f => f());
            // [...this._thisSubscribers].forEach(f => this._runNotification(f, this, id));
            this._runNotification(this._thisSubscribers, this, id);
            // if (this._parentListener)
            //   this._runNotification(this._parentListener);
            this._runNotification(this);
            // Record the remove in the history.
            this._getRootState()._history.push({
              action: "remove",
              propId: this._props,
              target: this as any,
              element: eltToDelete
            } as HistoryTableAction);

            // this._getRootState()._history.push({
            //   action: "anyAction",
            //   propId: this._props,
            //   target: this as any,
            //   undo: () => this.set(id, eltToDelete),
            //   redo: () => this.delete(id),   
            // } as HistoryTableAction);
          });
        });
        // console.log("remove done ", `remove-${this._path()}-${id}`);
        this._logger()?.groupEnd();

        eltToDelete.__beingRemoved__ = undefined;
        eltToDelete.__removed__ = true;
      });

    }

  }
}

export interface StateTableInterface<T> extends StateBaseInterface<Map<IdType<T>, StateObject<T>>> {

  _isStateTable: boolean;

  ids(): IdType<T>[];

  map<R>(f: (o: StateObject<T>) => R): R[];

  flatMap<R>(f: (o: StateObject<T>) => R[]): R[];
  find(predicate: (o: StateObject<T>) => boolean): StateObject<T>;

  _subscribeIds(listener: (ids: IdType<T>[]) => void): () => void;

  _insertListeners: ((o: StateObject<T>) => void)[];
  onInsert(listener: (o: StateObject<T>) => void): () => void;

  attach(fun: (o: StateObject<T>) => (() => void) | void): () => void;

  insert(elt: T | StateObject<T>): StateObject<T>;

  clone(id: IdType<T>, newId?: IdType<T>): StateObject<T>;
  set(id: IdType<T>, value: StateObject<T>): StateTableInterface<T>;

  assertGet(id: IdType<T>): StateObject<T>;

  _get(id: IdType<T>): StateObject<T>;

  _set(id: IdType<T>, val: StateObject<T>): StateTableInterface<T>;

  remove(id: IdType<T>): void;
  onKeyDelete(listener: () => void): () => void;
}

export type StateTable<T> = StateTableInterface<T> & Map<IdType<T>, StateObject<T>>; 