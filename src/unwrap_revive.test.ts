import { createState, stateTable } from "./nobostate";
import { stateReference, StateReference } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { newIntId, newStringId } from "./StateTable";
import { unwrapState } from "./unwrap_revive";

test('revive-reference', () => {
  type Item = {id: number};

  let state = createState({
    table1: stateTable<{id: number, ref: StateReference<Item>}>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2)});

  let obj2 = state.table2.insert({id: 42 });
  let obj1 = state.table1.insert({id: 1, ref: stateReference(42) });

  let unwrapped = unwrapState(state);

  expect(unwrapped).toEqual({_stateObject: {
    table1: { _stateTable: [{ _stateObject: {id: 1, ref: { _stateReference: 42 }}}] },
    table2: { _stateTable: [{ _stateObject: {id: 42}}] },
  }})

  let state2 = createState({
    table1: stateTable<{id: number, ref: StateReference<Item>}>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2)});

  state2._load(unwrapped);
  
  // expect(state2.table1.assertGet(1).ref.id).toBe(42);
});