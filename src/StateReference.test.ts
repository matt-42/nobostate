import { createState, stateTable } from "./nobostate";
import { StateReference } from "./StateReference";
import { stateReferenceArrayMixin, StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";

type Test = { id: string, text: string };
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
  state.table2.insert({ id: "1", ref: StateReference<Test>("1") });

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
  state.table2.insert({ id: "1", ref: StateReference<Test>("1") });
  state.table2.insert({ id: "2", ref: StateReference<Test>("1") });
  state.table2.insert({ id: "3", ref: StateReference<Test>("2") });

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
  state.table2.insert({ id: "1", ref: StateReference<Test>("42"), x: 0 });

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
        specs.reference(props.table2.ref, props.table1, { onThisDeleted: "cascade" });
      }
    });

  state.table1.insert({ id: "42", text: "xxx" });
  state.table2.insert({ id: "1", ref: StateReference<Test>("42"), x: 0 });

  state.table2.remove("1");
  expect(state.table2.size).toBe(0);
  expect(state.table1.size).toBe(0);
});


test('reference-many', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
  },
    { setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });

  expect(state.table2.get("1").refs.length).toBe(2);
  expect(state.table2.get("1").refs[0].text).toBe("a");
  expect(state.table2.get("1").refs[1].text).toBe("b");

  state.table1.assertGet("42").text = "c";
  expect(state.table2.get("1").refs[0].text).toBe("c");

});

test('reference-many-deletethis-cascade', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
  },
    { setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1, {onThisDeleted: "cascade"});
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });
  
  state.table2.remove("1");
  expect(state.table2.size).toBe(0);
});


// test('reference-many', () => {

//   let state = createState({
//     table1: stateTable<Test>(),
//     table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
//   },
//     {
//       setSpecs: (props, specs) => {
//         specs.referenceArray(props.table2.refs, props.table1, {
//           onThisDeleted: "cascade",
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



