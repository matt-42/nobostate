

/**
 * From a plain javascript object, create a state object.
 * To create table:
 *   - { _stateTable: [...] }
 *   - new StateTable<T>()
 * To create an object: { _stateObject: props... }
 * @param state 
 * @param propId 
 * @param ignoreProps 
 */

import { stateArray, stateObject, stateObjectArray, stateTable } from "./nobostate";
import { StateArray, StateObjectArray } from "./StateArray";
import { StateObject } from "./StateObject";
import { nullStateReference, stateReference, StateReference, stateReferenceNotNull } from "./StateReference";
import { StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";
import { StateTable } from "./StateTable";

type unwrappedObject = { _stateObject: any }
type unwrappedArray = { _stateArray: any[] }
type unwrappedObjectArray = { _stateObjectArray: any[] }
type unwrappedTable = { _stateTable: any[] }
// type unwrapped = { _stateTable: any[] }

type unwrappedAny = unwrappedObject | unwrappedArray | unwrappedObjectArray | unwrappedTable;

// Revive references after all state table elements has been revived.
export function reviveReferences(state: any, srcData: any): any {

  if (!state) return;
  if (state._isStateReference !== undefined) {
    try {
      (state as StateReference<any>).set(srcData._stateReference);
    } catch (e) {
      console.error(`Error when setting reference: ${e}`);
      throw e;
    }
  }
  else if (state._isStateReferenceArray !== undefined) {
    (state as StateReferenceArray<any>).push(...srcData._stateReferenceArray);
  }
  else if (state._isStateObject) {
    for (let k in state)
      if (!k.startsWith("_") && srcData._stateObject[k])
        reviveReferences(state[k], srcData._stateObject[k]);
    return;
  }
  else if (state._isStateTable) {
    let elements = new Map<number | string, any>();
    srcData._stateTable.forEach((elt: any) => elements.set(elt._stateObject.id, elt));
    (state as StateTable<any>).forEach(elt => {
      reviveReferences(elt, elements.get(elt.id));
    });
  }
  // else if (state._isStateArray) {
  //   return state;
  // }
  else if (state._isStateObjectArray) {
    for (let i = 0; i < (state as StateObjectArray<any>).length; i++)
      reviveReferences(state[i], srcData._stateObjectArray[i]);
    return;
  }
  else return;
}

export function revive(state: unwrappedAny): any {

  if (!state) return state;

  let anyState: any = state;
  // Do not re-bind already bound objects.
  if (anyState._isStateBase !== undefined)
    throw new Error("Cannot revive a State object");
  // if (anyState._registerChild) return state;

  // map.
  else if (anyState._stateTable !== undefined) {
    let table = stateTable();
    // console.log(anyState._stateTable.length, "ids"); 
    anyState._stateTable.forEach((elt: any) => {
      // console.log("revive id ", elt._stateObject.id, elt._stateObject);
      table.insert(revive(elt)); 
    });
    return table as any;
  }
  // Array
  else if (anyState._stateArray !== undefined) {
    let arr = stateArray();
    arr.push(...anyState._stateArray);
    return arr as any;
  }
  // Object Array.
  else if (anyState._stateObjectArray !== undefined) {
    let arr = stateObjectArray();
    arr.push(...anyState._stateObjectArray.map(revive));
    return arr as any;
  }
  // Object
  else if (anyState._stateObject !== undefined) {
    let obj = stateObject(Object);
    for (let k in anyState._stateObject)
      (obj as any)[k] = revive(anyState._stateObject[k]);
    return obj;
  }
  else if (anyState._stateReference !== undefined) {
    // Refs are initialized after with reviveReferences
    return anyState._notNull ? 
      stateReferenceNotNull<any>(null) : stateReference<any>(null);
  }
  else if (anyState._stateReferenceArray !== undefined) {
    return stateReferenceArray();
  }
  // prop
  else
    return state;
}

export function revive2(state: unwrappedAny, parent : StateObject<any>, key: string): any {

  //console.log("revive2 key", parent._path(), key);

  if (!state) return state;

  let anyState: any = state;
  // Do not re-bind already bound objects.
  if (anyState._isStateBase !== undefined)
    throw new Error("Cannot revive a State object");
  // if (anyState._registerChild) return state;

  // map.
  else if (anyState._stateTable !== undefined) {
    // console.log("state table!")
    let table = parent[key] || stateTable();
    if (!parent._getRootState()._history) throw new Error();

    // if (!parent._history && !parent._parent) throw new Error("Missing parent: " + parent._path());

    parent[key] = table;
    table.clear();
    if (!table._getRootState()._history) throw new Error("!table._getRootState()._history " + key);
    // console.log(anyState._stateTable.length, "ids"); 
    anyState._stateTable.forEach((elt: any) => {
      // console.log("revive id ", elt._stateObject.id, elt._stateObject);
      revive2(elt, table, elt._stateObject.id);
      // console.log(elt._stateObject.id)
    });
  }
  // Array
  else if (anyState._stateArray !== undefined) {
    let arr = parent[key] || stateArray();
    if (!parent._isStateObject) throw new Error();
    parent[key] = arr;
    if (!arr._getRootState()._history) throw new Error("Missing parent: obj is stateArray");

    arr.push(...anyState._stateArray);
    return arr as any;
  }
  // Object Array.
  else if (anyState._stateObjectArray !== undefined) {
    let arr = parent[key] || stateObjectArray();
    if (!parent._isStateObject) throw new Error();
    
    parent[key] = arr;
    if (!arr._getRootState()._history) throw new Error("Missing parent: obj is stateArray");
    anyState._stateObjectArray.forEach((elt : any, idx : number) => {
      revive2(elt as any, arr, idx as any);
    });
    return arr as any;
  }
  // Object
  else if (anyState._stateObject !== undefined) {
    let obj = parent[key] || stateObject(Object);
    (obj as any).id = anyState._stateObject.id;
    if (parent._isStateTable)
    {
      parent.insert(obj);
    }
    else if (parent._isStateObjectArray)
    {
      parent.push(obj);
    }
    else
    {
      parent[key] = obj;
      
    }
    if (!obj._getRootState()._history) 
    {
      console.log(parent._isStateBase, parent._isRootState, Object.keys(parent), "removed", parent.__removed__);
      console.log(obj._parent === parent);
      console.log(!!parent._parent);
      throw new Error("Missing parent: obj is stateobject, parent is stateobject ");
    }
    
    for (let k in anyState._stateObject)
      revive2(anyState._stateObject[k], obj, k);
  }
  else if (anyState._stateReference !== undefined) {
    // Refs are initialized after with reviveReferences
    if (!parent._isStateObject) throw new Error();

    parent[key] = parent[key] || (anyState._notNull ? 
      stateReferenceNotNull<any>(null) : stateReference<any>(null));
    // console.log(Object.keys(parent));
    if (!parent._getRootState()._history) throw new Error("Missing parent: obj is statereference");
    
  }
  else if (anyState._stateReferenceArray !== undefined) {
    if (!parent._isStateObject) throw new Error();
    parent[key] = parent[key] || stateReferenceArray();
    if (!parent[key]._getRootState()._history) throw new Error("Missing parent: obj is _stateReferenceArray");
  }
  // prop
  else {
    parent[key] = state;
  }
}

function initializePropIdentifiers(propId: any, state: any) {
  state.propId = propId;
  for (let k in state)
    if (typeof state[k] !== 'function')
      initializePropIdentifiers(propId[k], state[k]);
}

/**
 * Extract state for serialization. 
 * @param state 
 */
type UnwrapedType<T> =
  T extends StateTable<infer O> ? { _stateTable: UnwrapedType<O>[] } :
  T extends StateObject<infer O> ? { _stateObject: UnwrapedType<O> } :
  T extends StateArray<infer O> ? { _stateArray: UnwrapedType<O>[] } :
  T;

export function unwrapState<T>(state: T): UnwrapedType<T>;
export function unwrapState<T>(state: T): any {
  if (!state) return state;

  else if ((state as any)._isStateReference) { // Ref
    let ref = (state as any as StateReference<any>)
    return { _stateReference: ref.ref ? ref.ref.id : null, _notNull: (ref as any)._isStateReferenceNotNull };
  }
  else if ((state as any)._isStateReferenceArray) { // Ref Array
    let ref = (state as any as any[])
    return { _stateReferenceArray: ref.map(r => r.id) };
  }
  else if ((state as any)._isStateTable) { // Table
    return { _stateTable: [...(state as any as StateTable<any>).values()].map(v => unwrapState(v)) };
  }
  else if ((state as any)._isStateObject) { // StateObject
    let obj = {} as any;
    let src = state as any;
    for (let k in src)
      if (typeof src[k] !== 'function' && !k.startsWith("_"))
        obj[k] = unwrapState(src[k]);
    return { _stateObject: obj };
  }
  else if ((state as any)._isStateArray) { // StateArray && StateObjectArray
    let stateArray = state as any as StateArray<any>;
    let arr = [];
    for (let i = 0; i < stateArray.length; i++)
      arr.push(unwrapState(stateArray[i]));

    if ((state as any)._isStateObjectArray)
      return { _stateObjectArray: arr };
    else
      return { _stateArray: arr };
  }
  return state;
}

