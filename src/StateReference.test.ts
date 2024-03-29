import { createState, stateObject, stateTable } from "./nobostate";
import { nullStateReference, stateReference, StateReference } from "./StateReference";
import { stateReferenceArrayMixin, StateReferenceArray, stateReferenceArray } from "./StateReferenceArray";
import { newIntId, newStringId } from "./StateTable";

type Test = { id: string, text: string };

test('null-ref', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  let obj = state.table2.insert({ id: "1", ref: stateReference<Test>("1") });

  obj.ref = stateReference<Test>(null);
  expect(obj.ref.ref).toBe(null);

  expect(state.table1.size).toBe(0);
});


test('ref-must-have-specs', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  });


  state.table1.insert({ id: "1", text: "xxx" });
  expect(() => state.table2.insert({ id: "1", ref: stateReference<Test>("1") })).toThrowError();

});


test('update-ref-with-_update', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  let obj = state.table2.insert({ id: "1", ref: stateReference<Test>("1") });

  obj._update({ ref: stateReference<Test>(null) });

  expect(obj.ref.ref).toBeFalsy();
  expect(state.table1.size).toBe(0);

  state.table1.insert({ id: "1", text: "xxx" });
  obj._update({ ref: stateReference<Test>("1") });
  expect(obj.ref.ref).toBeTruthy();
  expect(obj.ref.ref.id).toBe("1");

});


test('update-ref-with-equal', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, testRef: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.testRef, props.table1);
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table1.insert({ id: "2", text: "xxx" });
  let obj = state.table2.insert({ id: "1", testRef: stateReference<Test>("1") });

  obj.testRef = stateReference<Test>(null);
  expect(obj.testRef.ref).toBe(null);
  expect(state.table1.size).toBe(2);

  obj.testRef = stateReference<Test>("2");
  expect(obj.testRef.ref.id).toBe("2");

  obj.testRef = stateReference<Test>({ id: newStringId(), text: "a" });
  expect(obj.testRef.ref.text).toBe("a");
  expect(obj.testRef.ref.id === "3").toBeTruthy();
  expect(state.table1.size).toBe(3);

});


test('ref-change-should-not-forward', () => {
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

  expect(state.table2.assertGet("1").ref.ref.id).toBe("1");
  expect(state.table2.assertGet("1").ref.ref.text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.assertGet("1").ref.ref).toBe(null);

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

  let obj1 = state.table2.insert({ id: "1", ref: stateReference<Test>("1") });
  state.table2.insert({ id: "2", ref: stateReference<Test>("1") });
  state.table2.insert({ id: "3", ref: stateReference<Test>("2") });

  expect(obj1.ref.ref.id).toBe("1");
  expect(obj1.ref.ref.text).toBe("xxx");

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
              dst.ref.set(null);
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
  expect(state.table2.get("1").ref.ref).toBe(null);
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

  expect(state.table2.get("1").ref.ref.id).toBe("42");

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
  expect(state._history.size()).toBe(1);

  let obj = state.table2.assertGet("1");

  expect(state.table2.assertGet("1").ref.ref).toBe(null);

  obj.ref.set({
    id: newStringId(),
    text: "xxx"
  });
  expect(state._history.size()).toBe(2);

  expect(state.table2.assertGet("1").ref.ref !== null).toBe(true);
  expect(state.table1.size).toBe(1);
  // expect(state._history.size()).toBe(2);

  let ref = state.table2.assertGet("1").ref;
  expect(ref).toBe(state.table2.assertGet("1").ref);

  // console.log("SET NULL ------------ ");
  ref.set(null);
  // console.log("SET NULL ------------ DONE ");
  expect(state.table1.size).toBe(0);

  // state.table2.assertGet("1").ref.set(null);
  expect(ref.ref).toBe(null);
  expect(ref.ref).toBeFalsy();
  // expect(state._history.size()).toBe(3);

  // console.log("UNDO ------------ ");
  state._history.undo();
  // console.log("UNDO ------------ DONE ");
  
  expect(state.table1.size).toBe(1);
  expect(ref.ref).toBeTruthy();
  expect(ref.ref.id).toBeDefined();
  // console.log("ID:", ref.ref.id, state.table1.get("1"));
  // expect(state._history.size()).toBe(3);

  state._history.redo();

  expect(state.table1.size).toBe(0);
  // expect(state._history.size()).toBe(3);
  expect(ref.ref === null).toBeTruthy();

});


test('table-undo-insert-with-ref', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, {own: false, onRefDeleted: "cascade"});
      }
    });

  let obj = state.table2.insert({
    id: "1",
    x: 42,
    ref: stateReference<Test>({
      id: newStringId(),
      text: "xxx"
    })
  });

  expect(state.table1.size).toBe(1);
  expect(state.table2.size).toBe(1);

  state._history.undo();

  expect(state.table2.size).toBe(0);
  expect(state.table1.size).toBe(0);
  
  // console.log(">>>>>>> REDO")
  state._history.redo();
  // console.log("<<<<<<< REDO")
 
  expect(state.table1.size).toBe(1);
  expect(state.table2.size).toBe(1);
  expect(state.table2.get("1") === obj).toBeTruthy();
  expect(state.table2.get("1")).toBeTruthy();
  expect(state.table2.get("1").x).toBe(42);
  expect(state.table2.get("1").ref.ref).toBeTruthy();
  expect(state.table2.get("1").ref.ref?.text).toBe("xxx");

});


test('table-undo-remove-with-ref', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, {own: true, onRefDeleted: "cascade"});
      }
    });

  let obj = state.table2.insert({
    id: "1",
    x: 0,
    ref: stateReference<Test>({
      id: newStringId(),
      text: "xxx"
    })
  });

  expect(state.table1.size).toBe(1);
  expect(state.table2.size).toBe(1);

  state.table2.remove(obj.id);

  
  expect(state.table2.size).toBe(0);
  expect(state.table1.size).toBe(0);
  
  state._history.undo();

  expect(state.table1.size).toBe(1);
  expect(state.table2.size).toBe(1);

  expect(state.table2.get("1")).toBeTruthy();
  const new1 = state.table1.get("1");

  expect(state.table2.get("1").ref.ref === new1).toBe(true);

  state._history.redo();

  expect(state.table2.size).toBe(0);
  expect(state.table1.size).toBe(0);
  
});


test('check-multiple-owner', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true });
      }
    });

  let obj = state.table1.insert({ id: "42", text: "xxx" });
  let obj1 = state.table1.insert({ id: "43", text: "xxx" });
  let objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>(obj) });

  // state.table2.insert({ id: "2", ref: stateReference<Test>(obj)});
  expect(() => state.table2.insert({ id: "2", ref: stateReference<Test>(obj) })).toThrowError();

  state.table2.insert({ id: "3", ref: stateReference<Test>(obj1) });

});

test('back-reference', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test>, x: number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: false });
      }
    });

  let obj = state.table1.insert({ id: "42", text: "xxx" });
  let objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>("42"), x: 34324 });

  expect(obj._backReferences(state._props.table2.ref).length).toBe(1);

  let br = obj._backReferences(state._props.table2.ref)[0];
  expect(br.id === objWithRef.id).toBe(true);
  expect(br.x === objWithRef.x).toBe(true);
  // expect(br === objWithRef).toBe(true);

  objWithRef.ref.set(null);
  expect(obj._backReferences(state._props.table2.ref).length).toBe(0);

  objWithRef.ref.set("42");
  expect(obj._backReferences(state._props.table2.ref).length).toBe(1);

  state.table2.remove("1");
  expect(obj._backReferences(state._props.table2.ref).length).toBe(0);

});


test('_subscribeRef', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1);
      }
    });

  let obj = state.table1.insert({ id: "42", text: "xxx" });
  let obj1 = state.table1.insert({ id: "43", text: "xxx" });
  let objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>(obj) });

  let called = 0;
  let dispose = objWithRef.ref._subscribeRef(ref => {
    called++;
    if (called === 1) expect(ref.ref).toBe(obj);
    if (called === 2) expect(ref.ref).toBe(obj1);
    if (called === 3) expect(ref.ref).toBe(null);
  });

  objWithRef.ref.set(obj);
  expect(called).toBe(1);
  objWithRef.ref.set("43");
  expect(called).toBe(2);
  objWithRef.ref.set(null);
  expect(called).toBe(3);

  dispose();
  objWithRef.ref.set(obj);
  expect(called).toBe(3);

});



test('onRefDeleted-called-before-element-removal', () => {


  let called = 0;
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, {
          own: true, onRefDeleted: (elt, removed) => {
            called++;
            expect(state.table1.has(removed.id)).toBe(true);
          }
        });
      }
    });


  let objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>({ id: newStringId(), text: "x" }) });

  state.table1.remove(objWithRef.ref.ref.id);

  expect(called).toBe(1);

  expect(state.table1.size).toBe(0);
  state.table2.remove(objWithRef.id);
  expect(state.table2.size).toBe(0);

  objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>({ id: newStringId(), text: "x" }) });
  state.table2.remove(objWithRef.id);
  expect(called).toBe(2);
  expect(state.table1.size).toBe(0);
});


test('own-cascade', () => {


  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateReference<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.reference(props.table2.ref, props.table1, { own: true, onRefDeleted: "cascade" });
      }
    });


  let objWithRef = state.table2.insert({ id: "1", ref: stateReference<Test>({ id: newStringId(), text: "x" }) });

  state.table1.remove(objWithRef.ref.ref.id);


  expect(state.table1.size).toBe(0);
  expect(state.table2.size).toBe(0);

});
