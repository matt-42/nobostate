import { createState, stateTable } from "./nobostate";
import { stateReference, StateReference } from "./StateReference";
import { stateReferenceArray, StateReferenceArray } from "./StateReferenceArray";
import { newIntId, newStringId } from "./StateTable";

interface Todo {
  id: string,
  description: string
  nullable: number | null
};

let state = createState({
  todos: stateTable<Todo>()
  // todos: Array<Todo>()
});

test('table-insert-remove', () => {
  // console.log(state);
  // state.t
  // let table = stateTable<Todo>();
  // console.log(table);
  expect(state.todos.size).toBe(0);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);

  expect(() => state.todos.insert({ id: "1", description: "test", nullable: 23 })).toThrowError();

  // state.todos[1]
  let todo = state.todos.assertGet("1");
  expect(todo.id).toEqual("1");
  expect(todo.nullable).toEqual(23);
  expect(todo.description).toEqual("test");

  state.todos.remove("1");
  expect(state.todos.size).toBe(0);

});


test('subscribe on table', () => {

  let called = false;
  let called2 = false;
  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  state._subscribeKey("todos", () => called2 = true)
  state.todos._subscribeKey("1", todo => {
    expect(todo.nullable).toBe(12);
    called = true;
  });

  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);

  expect(called).toBe(true);
  expect(called2).toBe(true);

});

// listen on insert/remove
test('subscribe-table-insert-remove', () => {

  let state = createState({
    todos: stateTable<Todo>()
  });

  expect(state.todos._parentListener).toBeTruthy();
  let called = 0;
  // state.todos._subscribe(() =>
  //   called++
  // );
  state._subscribeKey("todos", () =>
    called++
  );

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(called).toBe(1);
  state.todos.remove("1");
  expect(called).toBe(2);
});

test("table iterator", () => {
  let state = createState({ todos: stateTable<Todo>() });

  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  state.todos.insert({ id: "2", description: "test2", nullable: 24 });

  let arr = [...state.todos.values()];

  expect(arr.length).toBe(2);
  expect(arr[0].nullable).toBe(23);
  expect(arr[1].nullable).toBe(24);
});


test("table-attach-new-elements", () => {
  let state = createState({ table: stateTable<{ id: number }>() });

  let called = 0;
  state.table.attach(elt => {
    called++;
    expect(called).toBe(elt.id);

    return () => {
      expect(called).toBe(elt.id);
      called--;
    }
  });

  state.table.insert({ id: 1 });
  state.table.insert({ id: 2 });

  expect(called).toBe(2);

  state.table.remove(2);
  state.table.remove(1);

  expect(called).toBe(0);
});
test("table-attach-existing-elements", () => {
  let state = createState({ table: stateTable<{ id: number }>() });

  state.table.insert({ id: 1 });
  state.table.insert({ id: 2 });

  let called = 0;
  state.table.attach(elt => {
    called++;
    expect(called).toBe(elt.id);

    return () => {
      expect(called).toBe(elt.id);
      called--;
    }
  });


  expect(called).toBe(2);
  state.table.insert({ id: 3 });
  expect(called).toBe(3);

});

test("table-attach-subscribe", () => {
  type Test = { id: number,  };
  type Test2 = { id: number, ref: StateReference<Test>, refArray: StateReferenceArray<Test> };
  let state = createState({ table1: stateTable<Test>(), table2: stateTable<Test2>() },
  {
    setSpecs: (props, specs) => {
      specs.reference(props.table2.ref, props.table1, {own: true});
      specs.reference(props.table2.refArray, props.table1, {own: true});
    }
  }
  );

  let removed = false;
  state.table2.attach(elt => {
    elt._subscribe(() => {
      expect(removed).toBe(false);
    });

    return () => {
      removed = true;
    }
  });

  let obj = state.table2.insert({ id: 1, ref: stateReference<Test>({id: newIntId() }), 
    refArray: stateReferenceArray<Test>([{id: newIntId() },{id: newIntId() }]) });

  state.table2.remove(1);
  expect(obj._removeListeners.length).toBe(0);

});

test('table-clone', () => {
  type Test = { id: string, text: string};

  let state = createState({
    table1: stateTable<Test>(),
  });

  state.table1.insert({ id: "1", text: "xxx" });
  let obj = state.table1.clone("1");
  // console.log(obj);
  expect(obj.id !== "1").toBe(true);
  expect(obj.text).toBe("xxx");
  expect(state.table1.has(obj.id)).toBeTruthy();
});

test('new-table-id', () => {
  let state = createState({
    table1: stateTable<{id: string}>(),
    table2: stateTable<{id: number}>(),
  });

  state._props.table1.id;

  let obj1 = state.table1.insert({id: newStringId() });
  let obj2 = state.table1.insert({id: newStringId() });
  expect(obj1.id).toBe("1");
  expect(obj2.id).toBe("2");

  let obj3 = state.table2.insert({id: newIntId() });
  let obj4 = state.table2.insert({id: newIntId() });
  expect(obj3.id).toBe(1);
  expect(obj4.id).toBe(2);

})