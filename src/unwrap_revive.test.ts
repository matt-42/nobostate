import { createState, stateArray, stateObjectArray, stateTable } from "./nobostate";
import { stateReference, StateReference, StateReferenceNotNull, stateReferenceNotNull } from "./StateReference";
import { StateReferenceArray } from "./StateReferenceArray";
import { unwrapState } from "./unwrap_revive";

test('unwrap-revive-reference', () => {
  type Item = { id: number };

  let state = createState({
    table1: stateTable<{ id: number, ref: StateReference<Item> }>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2) });

  let obj2 = state.table2.insert({ id: 42 });
  let obj1 = state.table1.insert({ id: 1, ref: stateReference(42) });

  let unwrapped = unwrapState(state);

  expect(unwrapped).toEqual({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1, ref: { _stateReference: 42 } } }] },
      table2: { _stateTable: [{ _stateObject: { id: 42 } }] },
    }
  })

  let state2 = createState({
    table1: stateTable<{ id: number, ref: StateReference<Item> }>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2) });

  state2._load(unwrapped);
  expect(state2.table1.assertGet(1).ref.ref.id).toBe(42);
});


test('revive-null-reference', () => {
  type Item = { id: number };
  let state = createState({
    table1: stateTable<{ id: number, ref: StateReference<Item> }>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2) });

  state._load({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1, ref: { _stateReference: null } } }] },
      table2: { _stateTable: [] },
    }
  });
  expect(state.table1.assertGet(1).ref.ref).toBe(null);
});


test('revive-null-reference-at-root', () => {
  type Item = { id: number };
  let state = createState({
    ref: stateReference<Item>(null),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.ref, props.table2) });

  state._load({
    _stateObject: {
      ref: { _stateReference: null },
      table2: { _stateTable: [] },
    }
  });
  expect(state.ref.ref).toBe(null);
});

test('revive-reference-array', () => {
  type Item = { id: number };
  let state = createState({
    table1: stateTable<{ id: number, ref: StateReferenceArray<Item> }>(),
    table2: stateTable<Item>(),
  }, { setSpecs: (props, specs) => specs.reference(props.table1.ref, props.table2) });

  state._load({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1, ref: { _stateReferenceArray: [42, 43] } } }] },
      table2: { _stateTable: [{ _stateObject: { id: 42 } }, { _stateObject: { id: 43 } }] },
    }
  });

  expect(state.table1.assertGet(1).ref[0].id).toBe(42);
  expect(state.table1.assertGet(1).ref[1].id).toBe(43);
});

test('revive-state-object-array', () => {
  type Item = { id: number, name: string };
  const newState = () => createState({
    arr: stateObjectArray<Item>()
  });

  const state = newState();

  state._load({
    _stateObject: {
      arr: { _stateObjectArray: [ 
        { _stateObject: { _id: 2, name: "test"} },
        { _stateObject: { _id: 3, name: "test3"} },
       ] }
    }
  });

  expect(state.arr[0].id == 2);
  expect(state.arr[0].name == "test");
  expect(state.arr[1].id == 3);
  expect(state.arr[1].name == "test3");
})



test('revive-state-object-array-of-statereferencearray', () => {
  type Item3 = { id: number, name: string };
  type Item2 = { id: number, name: string, item3: StateReferenceNotNull<Item3> };
  type Item = { id: number, refs: StateReferenceArray<Item2> };
  const newState = () => createState({
    items: stateTable<Item2>(),
    items3: stateTable<Item3>(),
    arr: stateObjectArray<Item>()
  }, { setSpecs: (props, specs) => {
    specs.reference(props.arr.refs, props.items); 
    specs.reference(props.items.item3, props.items3); 
  } });

  const state = newState();

  state._load({
    _stateObject: {

      items3: { _stateTable: [
        { _stateObject: {id: 1, name: "toto3"} },
        { _stateObject: {id: 2, name: "tata3"} },
      ]},
      items: { _stateTable: [
        { _stateObject: {id: 1, name: "toto", item3: { _stateReference: 1, _notNull: true } } },
        { _stateObject: {id: 2, name: "tata", item3: { _stateReference: 2, _notNull: true } } },
      ]},
      arr: { _stateObjectArray: [ 
        { _stateObject: { _id: 2, refs: { _stateReferenceArray: [ 1, 2] }} },
        { _stateObject: { _id: 3, refs: { _stateReferenceArray: [ 2] } } },
       ] }
    }
  });

  expect(state.arr[0].id == 2);
  expect(state.arr[0].refs[0].name == "toto");
  expect(state.arr[0].refs[1].name == "tata");
  expect(state.arr[1].refs[0].name == "tata");

  expect(state.arr[0].refs[0].item3.ref.name == "toto3");
  expect(state.arr[0].refs[1].item3.ref.name == "tata3");
})

test('revive-notnull-reference-array', () => {
  type Item = { id: number };
  const newState = () => createState({
    table1: stateTable<{ id: number }>(),
    table2: stateTable<{ id: number, ref: StateReferenceNotNull<Item>, ref2: StateReference<Item> }>(),
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.table2.ref, props.table1);
      specs.reference(props.table2.ref2, props.table1);
    }
  });

  const state = newState();
  state._load({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1 } }] },
      table2: {
        _stateTable: [{
          _stateObject: {
            id: 1,
            ref: { _stateReference: 1, _notNull: true },
            ref2: { _stateReference: 1 }
          }
        }]
      }
    }
  });

  expect(state.table2.assertGet(1).ref._isStateReferenceNotNull).toBe(true);
  expect((state.table2.assertGet(1).ref2 as any)._isStateReferenceNotNull).toBe(undefined);

  const state2 = newState();
  state2._load(unwrapState(state));
  expect(state2.table2.assertGet(1).ref._isStateReferenceNotNull).toBe(true);
  expect((state2.table2.assertGet(1).ref2 as any)._isStateReferenceNotNull).toBe(undefined);

});
test('revive-array', () => {
  const newState = () => createState({
    arr1: stateArray<number>(),
  });

  const state = newState();
  state._load({
    _stateObject: {

      arr1: { _stateArray: [0, 1, 2, 3] }
    }
  });

  expect(state.arr1.length).toBe(4);
  expect(state.arr1[0]).toBe(0);
  expect(state.arr1[1]).toBe(1);
  expect(state.arr1[2]).toBe(2);
  expect(state.arr1[3]).toBe(3);

});
test('revive-object-incomplete', () => {
  type Item = { id: number };
  const newState = () => createState({
    table1: stateTable<{ id: number }>(),
    table2: stateTable<{ id: number, ref: StateReferenceNotNull<Item>, ref2: StateReference<Item> }>(),
  }, {
    setSpecs: (props, specs) => {
      specs.reference(props.table2.ref, props.table1);
      specs.reference(props.table2.ref2, props.table1);
    }
  });

  const state = newState();
  state._load({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1 } }] },
      // table2: {
      //   _stateTable: [{
      //     _stateObject: {
      //       id: 1,
      //       ref: { _stateReference: 1, _notNull: true },
      //       ref2: { _stateReference: 1 }
      //     }
      //   }]
      // }
    }
  });


});

test('revive-zero-number', () => {
  type Item = { id: number };
  const newState = () => createState({
    table1: stateTable<{ id: number, position: number|null }>(),
  }, {
  });

  const state = newState();
  state._load({
    _stateObject: {
      table1: { _stateTable: [{ _stateObject: { id: 1, position: 0 } },{ _stateObject: { id: 2, position: null } }] },
    }
  });

  expect(state.table1.get(1)?.position).toBe(0);
  expect(state.table1.get(2)?.position).toBe(null);

});

