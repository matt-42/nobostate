

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

import { StateArray, stateArrayMixin, StateObjectArray } from "./StateArray";
import { stateArray, stateObject, stateObjectArray, stateTable } from "./nobostate";
import { stateBaseMixin } from "./StateBase";
import { StateObject, stateObjectMixin } from "./StateObject";
import { StateReference, stateReference } from "./StateReference";
import { stateReferenceArray, stateReferenceArrayMixin } from "./StateReferenceArray";
import { StateTable, stateTableMixin } from "./StateTable";

type unwrappedObject = { _stateObject: any }
type unwrappedArray = { _stateArray: any[] }
type unwrappedObjectArray = { _stateObjectArray: any[] }
type unwrappedTable = { _stateTable: any[] }
// type unwrapped = { _stateTable: any[] }

type unwrappedAny = unwrappedObject | unwrappedArray | unwrappedObjectArray | unwrappedTable;

// Revive references after all state table elements has been revived.
export function reviveReferences(state: any): any {

  if (state._stateReference !== undefined) {
    return stateReference(state._stateReference);
  }
  else if (state._stateReferenceArray !== undefined) {
    return stateReferenceArray(state._stateReference);
  }
  else if (state._isStateObject) {
    for (let k in state._stateObject)
      if (!k.startsWith("_"))
        (state as any)[k] = reviveReferences(state[k]);
    return state;
  }
  else if (state._isStateTable)
  {
    for (let elt of (state as StateTable<any>).values())
      (state as StateTable<any>).set(elt.id, reviveReferences(elt));
    return state;
  }
  else if (state._isStateArray) {
    return state;
  }
  else if (state._isStateObjectArray) {
    for (let i = 0; i < (state as StateObjectArray<any>).length; i++)
      state[i] = reviveReferences(state[i]);
    return state;
  }
  else return state;
}

export function revive(state: unwrappedAny): any {

  let anyState: any = state;
  // Do not re-bind already bound objects.
  if (anyState._isStateBase)
    throw new Error("Cannot revive a State object");
  // if (anyState._registerChild) return state;

  // map.
  else if (anyState._stateTable) {
    let table = stateTable();
    anyState._stateTable.forEach((elt: any) => table.insert(revive(elt)));
    return table as any;
  }
  // Array
  else if (anyState._stateArray) {
    let arr = stateArray();
    arr.push(...anyState._stateArray);
    return arr as any;
  }
  // Object Array.
  else if (anyState._stateObjectArray) {
    let arr = stateObjectArray();
    arr.push(...anyState._stateObjectArray.map(revive));
    return arr as any;
  }
  // Object
  else if (anyState._stateObject) {
    let obj = stateObject(Object);
    for (let k in anyState._stateObject)
      (obj as any)[k] = revive(anyState._stateObject[k]);
    return obj;
  }
  // prop
  else
    return state;
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

  if ((state as any)._isStateReference) { // Ref
    let ref = (state as any as StateReference<any>)
    return { _stateReference: ref.ref ? ref.ref.id : null };
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
  else if ((state as any)._isStateArray) { // Array
    let stateArray = state as any as StateArray<any>;
    let arr = [];
    for (let i = 0; i < stateArray.length; i++)
      arr.push(unwrapState(stateArray[i]));
    return { _stateArray: arr };
  }
  return state;
}

