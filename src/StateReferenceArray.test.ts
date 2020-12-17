import { createState, stateTable } from "./nobostate";
import { StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";

type Test = { id: string, text: string };

test('reference-array-remove', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });

  let called = false;
  state.table2.assertGet("1")._subscribe(() => called = true);
  state.table2.assertGet("1").refs.remove(o => o.id === "42");
  expect(called).toBeTruthy();

  expect(state.table2.assertGet("1").refs.length).toBe(1);
  expect(state.table2.assertGet("1").refs[0].id).toBe("43");

});

test('reference-array', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });

  expect(state.table2.get("1").refs.length).toBe(2);
  expect(state.table2.get("1").refs[0].text).toBe("a");
  expect(state.table2.get("1").refs[1].text).toBe("b");

  // Update ref must signal this. 
  let called = false;
  state.table2.assertGet("1")._subscribe(() => called = true);

  state.table1.assertGet("42").text = "c";
  expect(state.table2.get("1").refs[0].text).toBe("c");

  expect(called).toBeTruthy();

  state.table2.assertGet("1").refs.remove(o => o.id === "42");
  called = false;
  state.table1.assertGet("42").text = "d";
  expect(called).toBeFalsy();



});

test('reference-array-deletethis-cascade', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1, { own: true });
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]), x: 0 });

  state.table2.remove("1");
  expect(state.table2.size).toBe(0);
});



test('reference-array-remove', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  let obj = state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]) });

  obj.refs.remove(o => o.id === "42");
  expect(obj.refs.length).toBe(1);
  expect(obj.refs[0].id).toBe("43");

  obj.refs.push("42");
  expect(obj.refs.length).toBe(2);

  state.table1.remove("42");
  expect(obj.refs.length).toBe(1);
  expect(obj.refs[0].id).toBe("43");

});

test('reference-array-undo-push', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  state.table1.insert({ id: "42", text: "a" });
  state.table1.insert({ id: "43", text: "b" });
  state.table1.insert({ id: "44", text: "c" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]) });

  let obj = state.table2.assertGet("1");

  obj.refs.push("44");

  expect(obj.refs.length).toBe(3);
  expect(obj.refs[2].text).toBe("c");

  state._history.undo();

  expect(obj.refs.length).toBe(2);

  // state.table2.remove("1");
  // expect(state.table2.size).toBe(0);
});



test('reference-array-back-reference', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, refs: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.refs, props.table1);
      }
    });

  let a = state.table1.insert({ id: "42", text: "a" });
  let b = state.table1.insert({ id: "43", text: "b" });
  let c = state.table1.insert({ id: "44", text: "c" });
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43"]) });
  state.table2.insert({ id: "2", refs: stateReferenceArray<Test>(["43"]) });

  let bra = a._backReferences(state.table2._props.refs);
  let brb = b._backReferences(state.table2._props.refs);

  expect(bra.length).toBe(1);
  expect(brb.length).toBe(2);

  expect(brb[0].id).toBe("1");
  expect(brb[1].id).toBe("2");

  expect(bra[0].id).toBe("1");

  state.table2.remove("1");

  expect(bra.length).toBe(0);
  expect(brb.length).toBe(1);

});



test('update-array-ref-with-_update', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table1.insert({ id: "2", text: "xxx" });
  let obj = state.table2.insert({ id: "1", ref: stateReferenceArray<Test>(["2"]) });

  expect(obj.ref[0].id).toBe("2");
  expect(obj.ref.length).toBe(1);

  stateReferenceArray<Test>(["1"]);
  expect(state.table1.size).toBe(2);

  obj._update({ ref: stateReferenceArray<Test>(["1"]) });

  expect(obj.ref.length).toBe(1);
  expect(obj.ref[0].id).toBe("1");
  expect(state.table1.size).toBe(1);
});

