import { createState, stateTable } from "./nobostate";
import { stateReference, StateReference } from "./StateReference";
import { stateReferenceArrayMixin, StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";
import { newStringId } from "./StateTable";

type Test = { id: string, text: string };

test('ref-change-listening', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1);
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateReference<Test>("1") });

  let called = false;
  state.table2.assertGet("1")._subscribe(() => called = true);
  state.table1.assertGet("1").text = "a";
  expect(called).toBe(true);

  // must unsubscribe.
  state.table2.assertGet("1").ref._set(null);
  called = false;
  state.table1.assertGet("1").text = "b";
  expect(called).toBe(false);

});

test('foreignkey-set-null', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { onRefDeleted: "set-null" });
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateReference<Test>("1") });

  let ref = state.table2.assertGet("1").ref;

  expect(state.table2.assertGet("1").ref.id).toBe("1");
  expect(state.table2.assertGet("1").ref.text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.assertGet("1").ref.id).toBe(undefined);

});

test('foreign-key-cascade', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { onRefDeleted: "cascade" });
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table1.insert({ id: "2", text: "xxx" });

  state.table2.insert({ id: "1", ref: stateReference<Test>("1") });
  state.table2.insert({ id: "2", ref: stateReference<Test>("1") });
  state.table2.insert({ id: "3", ref: stateReference<Test>("2") });

  expect(state.table2.assertGet("1").ref.id).toBe("1");
  expect(state.table2.assertGet("1").ref.text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.size).toBe(1);

});

test('foreign-key-custom-trigger', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1,
          {
            onRefDeleted: (dst, removed) => {
              dst.ref._set(null);
              dst.x = 1;
              expect(removed.id).toBe("42");
            }
          });
      }
    });

  state.table1.insert({ id: "42", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateReference<Test>("42"), x: 0 });

  state.table1.remove("42");
  expect(state.table2.size).toBe(1);
  expect(state.table2.get("1").ref.id).toBe(undefined);
  expect(state.table2.get("1").x).toBe(1);

});


test('foreign-key-on-this-deleted-cascade', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  state.table1.insert({ id: "42", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateReference<Test>("42"), x: 0 });

  state.table2.remove("1");
  expect(state.table2.size).toBe(0);
  expect(state.table1.size).toBe(0);
});


test('reference-undo', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  state.table2.insert({ id: "1", ref: stateReference<Test>(null), x: 0 });
  let obj = state.table2.assertGet("1");

  expect(state.table2.assertGet("1").ref.id).toBeUndefined();

  obj.ref._set({
    id: newStringId(),
    text: "xxx"
  });

  expect(state.table2.assertGet("1").ref.id).toBeDefined();
  expect(state.table1.size).toBe(1);
  expect(state._history.size()).toBe(2);

  let ref = state.table2.assertGet("1").ref;
  expect(ref).toBe(state.table2.assertGet("1").ref);

  ref._set(null);

  // state.table2.assertGet("1").ref._set(null);
  expect(ref.id).toBeUndefined();
  expect(ref._isNull()).toBeTruthy();
  expect(state._history.size()).toBe(3);

  state._history.undo();

  expect(state.table1.size).toBe(1);
  expect(ref._isNull()).toBeFalsy();
  expect(ref.id).toBeDefined();
  expect(state._history.size()).toBe(3);
  expect(ref.id).toBeDefined();

  state._history.redo();

  expect(state._history.size()).toBe(3);
  expect(ref.id).toBeUndefined();
  expect(ref._isNull()).toBeTruthy();

});

// test('reference-many', () => {

//   let state = createState({
//     table1: stateTable<Test>(),
//     table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
//   },
//     {
//       setSpecs: (props, specs) => {
//         specs.referenceArray(props.table2.refs, props.table1, {
//           own: true,
//           onRefDeleted: (obj, )
//         });
//       }
//     });

//   state.table1.insert({ id: "42", text: "a" });
//   state.table1.insert({ id: "43", text: "b" });
//   state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });

//   expect(state.table2.get("1").refs[0].text).toBe("a");
//   expect(state.table2.get("1").refs[1].text).toBe("b");

//   state.table2.remove("1");
//   expect(state.table2.size).toBe(0);
//   expect(state.table1.size).toBe(0);
// });



