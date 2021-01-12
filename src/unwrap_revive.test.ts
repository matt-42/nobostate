import { createState, stateTable } from "./nobostate";
import { stateReference, StateReference } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { unwrapState } from "./unwrap_revive";

test('unwrap-revive-reference', () => {
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
  expect(state2.table1.assertGet(1).ref.ref.id).toBe(42);
});


test('revive-null-reference', () => {
  type Item = {id: number};
  let state = createState({
    table1: stateTable<{id: number, ref: StateReference<Item>}>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2)});

  state._load({_stateObject: {
    table1: { _stateTable: [{ _stateObject: {id: 1, ref: { _stateReference: null }}}] },
    table2: { _stateTable: [] },
  }});
  expect(state.table1.assertGet(1).ref.ref).toBe(null);
});


test('revive-null-reference-at-root', () => {
  type Item = {id: number};
  let state = createState({
    ref: stateReference<Item>(null),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.ref, props.table2)});

  state._load({_stateObject: {
    ref: { _stateReference: null },
    table2: { _stateTable: [] },
  }});
  expect(state.ref.ref).toBe(null);
});

test('revive-reference-array', () => {
  type Item = {id: number};
  let state = createState({
    table1: stateTable<{id: number, ref: StateReferenceArray<Item>}>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2)});

  state._load({_stateObject: {
    table1: { _stateTable: [{ _stateObject: {id: 1, ref: { _stateReferenceArray: [42,43] }}}] },
    table2: { _stateTable: [{ _stateObject: {id: 42}}, { _stateObject: {id: 43}}] },
  }});

  expect(state.table1.assertGet(1).ref[0].id).toBe(42);
  expect(state.table1.assertGet(1).ref[1].id).toBe(43);
});
