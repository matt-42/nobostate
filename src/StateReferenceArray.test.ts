import { createState, stateTable } from "./nobostate";
import { StateObject } from "./StateObject";
import { StateReferenceNotNull, stateReferenceNotNull } from "./StateReference";
import { StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";
import { newStringId } from "./StateTable";

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

test('reference-arrray', () => {

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

  // Update ref in array must not signal this. 
  let called = false;
  state.table2.assertGet("1")._subscribe(() => called = true);

  state.table1.assertGet("42").text = "c";
  expect(state.table2.get("1").refs[0].text).toBe("c");

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
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42"]) });

  let obj = state.table2.assertGet("1");

  obj.refs.push("43");
  obj.refs.push("44");

  expect(obj.refs.length).toBe(3);
  expect(obj.refs[2].text).toBe("c");

  state._history.undo();
  state._history.undo();

  expect(obj.refs.length).toBe(1);

  state._history.redo();
  state._history.redo();

  expect(obj.refs.length).toBe(3);

  expect(obj.refs[0].text).toBe("a");
  expect(obj.refs[1].text).toBe("b");
  expect(obj.refs[2].text).toBe("c");

  // state.table2.remove("1");
  // expect(state.table2.size).toBe(0);
});

test('reference-array-undo-remove', () => {

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
  state.table2.insert({ id: "1", refs: stateReferenceArray<Test>(["42", "43", "44"]) });

  let obj = state.table2.assertGet("1");

  obj.refs.remove(o => o.id === "43");

  expect(obj.refs.length).toBe(2);
  expect(obj.refs[0].text).toBe("a");
  expect(obj.refs[1].text).toBe("c");

  state._history.undo();

  expect(obj.refs.length).toBe(3);

  expect(obj.refs[0].text).toBe("a");
  expect(obj.refs[1].text).toBe("b");
  expect(obj.refs[2].text).toBe("c");

  state._history.redo();

  expect(obj.refs.length).toBe(2);
  expect(obj.refs[0].text).toBe("a");
  expect(obj.refs[1].text).toBe("c");

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
        specs.referenceArray(props.table2.ref, props.table1, { own: true });
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

test('update-array-ref-with-_update', () => {
  type Test = { id: string };
  type TestRef = { id: string, ref: StateReferenceNotNull<Test> };
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<TestRef>(),
    table3: stateTable<{ id: string, refs: StateReferenceArray<TestRef> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table3.refs, props.table2, { own: true });
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  let obj = state.table3.insert({ id: "1", refs: stateReferenceArray<TestRef>() });

  obj.refs.push({
    id: "42",
    ref: stateReferenceNotNull<Test>({ id: "42" })
  });

  expect(state.table3.assertGet("1").refs[0].ref.ref.id).toBe("42");
  expect(state.table2.size).toBe(1);
  expect(state.table1.size).toBe(1);

});


test('remove-ownedRefArray-when-parent-is-removed', () => {


  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.ref, props.table1, { own: true });
      }
    });

  let obj = state.table2.insert({
    id: "1", ref: stateReferenceArray<Test>(
      [{ id: newStringId(), text: "a" }, { id: newStringId(), text: "b" }]
    )
  });

  expect(state.table1.size).toBe(2);
  expect(state.table2.size).toBe(1);

  state.table2.remove(obj.id);
  expect(state.table1.size).toBe(0);
  expect(state.table2.size).toBe(0);

});



test('unspecified-refarray-must-throw', () => {

  expect(() => {
    let state = createState({
      table1: stateTable<Test>(),
      table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
    },
      {
        setSpecs: (props, specs) => {
          //specs.referenceArray(props.table2.ref, props.table1, { own: true });
        }
      });
    state.table2.insert({ id: "1", ref: stateReferenceArray<Test>() });
  }).toThrowError();

});

test('refarray-push-array-arg-must-throw', () => {

  expect(() => {
    let state = createState({
      table1: stateTable<Test>(),
      table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
    },
      {
        setSpecs: (props, specs) => {
          specs.referenceArray(props.table2.ref, props.table1, { own: true });
        }
      });
    let obj = state.table2.insert({ id: "1", ref: stateReferenceArray<Test>() });
    obj.ref.push([] as any);
  }).toThrowError();

});

test('refarray-push-undo-redo', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.ref, props.table1, { own: true });
      }
    });
  let obj = state.table2.insert({ id: "1", ref: stateReferenceArray<Test>() });

  obj.ref.push({ id: newStringId(), text: "a" });
  expect(state.table1.size).toBe(1);

  state._history.undo();
  expect(state.table1.size).toBe(0);
  expect(obj.ref.length).toBe(0);

  state._history.redo();
  expect(obj.ref.length).toBe(1);
  expect(state.table1.size).toBe(1);

});


test('refarray-parent-remove-undo', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReferenceArray<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.ref, props.table1, { own: true });
      }
    });
  let obj = state.table2.insert({ id: "1", ref: stateReferenceArray<Test>([{ id: newStringId(), text: "a" }, { id: newStringId(), text: "b" }]) });

  expect(state.table1.size).toBe(2);
  expect(state.table2.size).toBe(1);

  state.table2.remove(obj.id);

  expect(state.table1.size).toBe(0);
  expect(state.table2.size).toBe(0);
  expect(obj.ref.length).toBe(0);

  state._history.undo();

  expect(state.table1.size).toBe(2);
  expect(state.table2.size).toBe(1);

  expect(obj.ref.length).toBe(2);
});

test('refarray-onRefDeleted-function', () => {

  type Test2 = { id: string, ref: StateReferenceArray<Test> };

  let obj: StateObject<Test2> | null = null;
  let tobeRemoved: StateObject<Test> | null = null;

  let called = 0;
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<Test2>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.ref, props.table1, {
          own: true, onRefDeleted: (elt, removed) => {
            expect(elt.id === obj.id).toBeTruthy();
            expect(elt.ref === obj.ref).toBeTruthy();
            expect(removed === tobeRemoved).toBeTruthy();
            called++;
          }
        });
      }
    });

  obj = state.table2.insert({ id: "1", ref: stateReferenceArray<Test>([{ id: newStringId(), text: "a" }]) });
  tobeRemoved = obj.ref[0];
  state.table1.remove(tobeRemoved.id);
  expect(called).toBe(1);
});


type TestNumber = { id: string, position: number };


test('set-zero-member', () => {

  let state = createState({
    table1: stateTable<TestNumber>(),
    table2: stateTable<{ id: string, ref: StateReferenceArray<TestNumber> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.referenceArray(props.table2.ref, props.table1);
      }
    });

  let obj = state.table2.insert({ id: "1", ref: stateReferenceArray<TestNumber>([{ id: newStringId(), position: 0 }])});

  expect(obj.ref[0].position).toBe(0);
  obj.ref.push({id: newStringId(), position: 0});

  expect(obj.ref[1].position).toBe(0);

})