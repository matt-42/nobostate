import { createState, stateArray, StateBaseClass, stateForeignKey, StateForeignKey, StateObject, stateObject, stateObjectArray, StateTable, stateTable, Subscriber, unwrapState } from "./nobostate";

function checkListenerCalled(state: any, key: any, fun: () => void) {
  let called = false;
  let dispose = state._subscribe(key, () => called = true);
  fun();
  expect(called).toBe(true);
  dispose();
}
function subscribeTest(state: any, listener: Function, update: () => void) {
  let called = false;
  let dispose = state._subscribe((s: any, prop: any) => { called = true; listener(s, prop); });
  update();
  expect(called).toBe(true);
  dispose();
}

interface Todo {
  id: string,
  description: string
  nullable: number | null
};

let state = createState({
  todos: stateTable<Todo>()
  // todos: Array<Todo>()
});

test('insert/remove', () => {
  // console.log(state);
  expect(state.todos.size).toBe(0);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);

  // state.todos[1]
  let todo = state.todos.assertGet("1");
  expect(todo.id).toEqual("1");
  expect(todo.nullable).toEqual(23);
  expect(todo.description).toEqual("test");

  state.todos.remove("1");
  expect(state.todos.size).toBe(0);

});

test('update props', () => {
  let state = createState({
    str: "",
    number: 0,
    arr: [0, 1, 2, 3]
  });

  checkListenerCalled(state, "str", () => state.str = "abc");
  expect(state.str).toBe("abc");
  checkListenerCalled(state, "number", () => state.number = 12);
  expect(state.number).toBe(12);
  checkListenerCalled(state, "arr", () => state.arr = [1, 2]);
  expect(state.arr).toEqual([1, 2]);
  checkListenerCalled(state, "arr", () => state.arr = [1, 2, 3, 4]);
  expect(state.arr).toEqual([1, 2, 3, 4]);
  checkListenerCalled(state, "arr", () => state.arr = [1, 2]);
  expect(state.arr).toEqual([1, 2]);
});

test('subscribe on object', () => {

  let called = false;
  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  // console.log(state.todos._assertassertGet("1")._subscribe);
  state.todos.assertGet("1")._subscribe("nullable", nullable => {
    // console.log("call!!");
    expect(nullable).toBe(12);
    called = true;
  });

  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);

  expect(called).toBe(true);
});

test('subscribe on table', () => {

  let called = false;
  let called2 = false;
  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  state._subscribe("todos", () => called2 = true)
  state.todos._subscribe("1", todo => {
    expect(todo.nullable).toBe(12);
    called = true;
  });

  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);

  expect(called).toBe(true);
  expect(called2).toBe(true);

});

// listen on insert/remove
test('subscribe on table insert/remove', () => {

  let state = createState({
    todos: stateTable<Todo>()
  });

  let called = 0;
  state._subscribe("todos", () => called++);

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

test('unwrap', () => {
  let state = createState({
    todos: stateTable<Todo>()
  });

  state.todos.insert({ id: "1", description: "test", nullable: 23 });

  expect(unwrapState(state)).toEqual({
    _stateObject: {
      todos: { _stateTable: [{ _stateObject: { id: "1", description: "test", nullable: 23 } }] }
    }
  });
});

test('load', () => {
  let state = createState({
    todos: stateTable<Todo>()
  });

  state._load({
    todos: { _stateTable: [{ id: "1", description: "test", nullable: 23 }] }
  });

  expect(state.todos.assertGet("1").id).toBe("1");
  expect(state.todos.assertGet("1").description).toBe("test");
  expect(state.todos.assertGet("1").nullable).toBe(23);
});

function subscribeCheck(state: any, key: any) {
  let called = false;
  state._subscribe(key, () => called = true);
  return () => expect(called).toBe(true);
}

// arrays.
test('array push', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });
  // console.log(state);
  let checkSubscribeonElement = subscribeCheck(state.todos, 0);
  let checkSubscribeonArray = subscribeCheck(state, "todos");
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.length).toBe(1);
  expect(state.todos[0].id).toBe("1");
  expect(state.todos[0].description).toBe("test");
  expect(state.todos[0].nullable).toBe(23);

  checkSubscribeonArray();
  checkSubscribeonElement();
});

test('array-set', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });
  // console.log(state);
  let checkSubscribeonElement = subscribeCheck(state.todos, 0);
  let checkSubscribeonArray = subscribeCheck(state, "todos");
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  checkSubscribeonArray();
  checkSubscribeonElement();

  expect(state.todos.length).toBe(1);
  expect(state.todos[0].id).toBe("1");
  expect(state.todos[0].description).toBe("test");
  expect(state.todos[0].nullable).toBe(23);
  expect((state.todos[0] as any)._propId).toBeTruthy();

  let checkSubscribeOnElementUpdate = subscribeCheck(state.todos, 0);
  let checkSubscribeOnElementUpdate1 = subscribeCheck(state, "todos");
  state.todos[0].nullable = 12;
  checkSubscribeOnElementUpdate();
  checkSubscribeOnElementUpdate1();

  expect([...state.todos].length).toBe(1);
});

test('object update', () => {
  let state = createState({ obj: stateObject<{ id: string, age: number }>({ id: "", age: 0 }) });

  state.obj._update({ id: "1", age: 12 });

  expect(state.obj.id).toBe("1");
  expect(state.obj.age).toBe(12);

  state.obj._update({ age: 24 });
  expect(state.obj.id).toBe("1");
  expect(state.obj.age).toBe(24);

});

// let state2 = createState({
//   todos: Table<{id : string, test: Todo[]}>()
// });

// state2.todos.get("0").test.
// // undo
test('undo updateprop', () => {
  let state = createState({
    todos: stateTable<Todo>()
  });
  // console.log(state);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);
  state._history.undo();
  expect(state.todos.assertGet("1").nullable).toBe(23);
  state._history.redo();
  expect(state.todos.assertGet("1").nullable).toBe(12);
});

test('undo insert', () => {
  let state = createState({
    todos: stateTable<Todo>()
  });
  // console.log(state);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);
  state._history.undo();
  expect(state.todos.size).toBe(0);
  state._history.redo();
  expect(state.todos.size).toBe(1);
  expect(state.todos.assertGet("1").nullable).toBe(23);
});

test('undo-remove', () => {
  let state = createState({
    todos: stateTable<Todo>()
  });
  // console.log(state);
  state.todos.insert({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.size).toBe(1);

  state.todos.remove("1");
  expect(state.todos.size).toBe(0);

  state._history.undo();
  expect(state.todos.size).toBe(1);
  expect(state.todos.assertGet("1").nullable).toBe(23);

  state._history.redo();
  expect(state.todos.size).toBe(0);
});


test('undo-push', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });
  // console.log(state);
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  expect(state.todos.length).toBe(1);

  state._history.undo();
  expect(state.todos.length).toBe(0);

  state._history.redo();
  expect(state.todos.length).toBe(1);
  expect(state.todos[0].nullable).toBe(23);

});

test('undo-group-push', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });
  // console.log(state);

  state._history.startGroup();
  state.todos.push({ id: "1", description: "test", nullable: 23 });
  state.todos.push({ id: "1", description: "test", nullable: 24 });
  state.todos.push({ id: "1", description: "test", nullable: 25 });
  state._history.endGroup();

  expect(state.todos[0].nullable).toBe(23);
  expect(state.todos[1].nullable).toBe(24);
  expect(state.todos[2].nullable).toBe(25);

  expect(state.todos.length).toBe(3);

  state._history.undo();
  expect(state.todos.length).toBe(0);

  state._history.redo();
  expect(state.todos.length).toBe(3);
  expect(state.todos[0].nullable).toBe(23);
  expect(state.todos[1].nullable).toBe(24);
  expect(state.todos[2].nullable).toBe(25);

});


test('undo-group', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });

  state._history.group("push", () => {
    state.todos.push({ id: "1", description: "test", nullable: 23 });
    state.todos.push({ id: "1", description: "test", nullable: 24 });
    state.todos.push({ id: "1", description: "test", nullable: 25 });
  });

  expect(state.todos[0].nullable).toBe(23);
  expect(state.todos[1].nullable).toBe(24);
  expect(state.todos[2].nullable).toBe(25);

  expect(state.todos.length).toBe(3);

  state._history.undo();
  expect(state.todos.length).toBe(0);

  state._history.redo();
  expect(state.todos.length).toBe(3);
  expect(state.todos[0].nullable).toBe(23);
  expect(state.todos[1].nullable).toBe(24);
  expect(state.todos[2].nullable).toBe(25);

});


test('undo-group-merge', () => {
  let state = createState({
    todos: stateObjectArray<Todo>()
  });

  state._history.group("push", () => {
    state.todos.push({ id: "1", description: "test", nullable: 23 });
    state.todos.push({ id: "1", description: "test", nullable: 24 });
    state.todos.push({ id: "1", description: "test", nullable: 25 });
  });
  expect(state._history.size()).toBe(1);

  expect(state.todos[0].nullable).toBe(23);
  expect(state.todos[1].nullable).toBe(24);
  expect(state.todos[2].nullable).toBe(25);

  expect(state.todos.length).toBe(3);

  state._history.group("push", () => {
    state.todos.push({ id: "1", description: "test", nullable: 26 });
  });
  expect(state._history.size()).toBe(1);
  expect(state.todos.length).toBe(4);

  state._history.group("push2", () => {
    state.todos.push({ id: "1", description: "test", nullable: 26 });
  });
  expect(state._history.size()).toBe(2);

  expect(state.todos.length).toBe(5);
  state._history.undo();
  expect(state.todos.length).toBe(4);
  state._history.redo();
  expect(state.todos.length).toBe(5);
  state._history.undo();
  expect(state.todos.length).toBe(4);
  state._history.undo();
  expect(state.todos.length).toBe(0);

});


test('wrapped methods', () => {

  let state = createState({ todos: stateTable<Todo>() });
  // let x = state.todos._use("test");

  expect(state.todos.size === 0);
});


test('nullable prop', () => {

  let state = createState({ test: stateObject<{ id: string | null }>({ id: null }) });

  expect(state.test.id).toBe(null);
  state.test.id = "a";
  expect(state.test.id).toBe("a");
});

test('read only objects', () => {

  let state = createState({ test: { id: "" } });

  // let x = state._use("test");
  state.test = { id: "2" };
  expect(state.test.id).toBe("2");
});

function testArrayAccess() {
  let state = createState({
    todos: stateTable<{ id: number, arr: number[] }>(),
  });

  state.todos.assertGet(0).arr = [];

}
function testUse() {
  let state = createState({
    todos: stateTable<Todo>(),
    arr: stateArray<Todo>(),
    arr2: stateObjectArray<Todo>(),
  });

  state._use("todos").assertGet("");

  let a: StateTable<Todo> = state._use("todos");
  let x: string = state.todos.assertGet("")._use("description");
  let x2: Todo = state.todos._use("x");
  let x3: Todo = state.arr._use(1);
  let x4: Todo = state.arr2._use(1);

  return [a];

}

test('object-assign', () => {

  let state = createState({
    todo: stateObject<Todo>({ id: "1", description: "", nullable: null })
  });

  let prev = state.todo;
  state.todo = stateObject<Todo>({ id: "1", description: "test", nullable: null });
  expect(state.todo === prev).toBe(true);
});

test('subscribers with key', () => {

  let state = createState({
    table: stateTable<Todo>(),
    array: stateArray<Todo>(),
    objectArray: stateObjectArray<Todo>(),
  });

  subscribeTest(state,
    (s: any, prop: any) => {
      expect(prop).toBe("table");
    },
    () => state.table.insert({ id: "1", description: "test", nullable: null })
  );

  subscribeTest(state,
    (s: any, prop: any) => expect(prop).toBe("table"),
    () => state.table.assertGet("1").description = "xx"
  );

  subscribeTest(state.table.assertGet("1"),
    (s: any, prop: any) => expect(prop).toBe("description"),
    () => state.table.assertGet("1").description = "xx"
  );

  subscribeTest(state.array,
    (s: any, prop: any) => expect(prop).toBe(0),
    () => state.array.push({ id: "1", description: "test", nullable: null })
  );

  subscribeTest(state.array,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.array.push({ id: "1", description: "test", nullable: null })
  );


  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(0),
    () => state.objectArray.push({ id: "1", description: "test", nullable: null })
  );

  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.objectArray.push({ id: "1", description: "test", nullable: null })
  );

  subscribeTest(state.objectArray,
    (s: any, prop: any) => expect(prop).toBe(1),
    () => state.objectArray[1].description = "test"
  );

});

function propId() {

  let state = createState({
    table: stateTable<Todo>(),
    array: stateArray<Todo>(),
    objectArray: stateObjectArray<Todo>(),
  }, {
    setSpecs: props => { props.objectArray.description._undoIgnore = true; }
  });

}


type Test = { id: string, text: string };
test('foreignkey-set-null', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateForeignKey<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.foreignKey(props.table2.ref, props.table1, "set-null");
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateForeignKey<Test>("1") });

  expect(state.table2.assertGet("1").ref.getId()).toBe("1");
  expect(state.table2.assertGet("1").ref.get().text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.assertGet("1").ref.getId()).toBe(null);

});

test('foreign-key-cascade', () => {
  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateForeignKey<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.foreignKey(props.table2.ref, props.table1, "cascade");
      }
    });

  state.table1.insert({ id: "1", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateForeignKey<Test>("1") });
  state.table2.insert({ id: "2", ref: stateForeignKey<Test>("1") });
  state.table2.insert({ id: "3", ref: stateForeignKey<Test>("2") });

  expect(state.table2.assertGet("1").ref.getId()).toBe("1");
  expect(state.table2.assertGet("1").ref.get().text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.size).toBe(1);

});

test('foreign-key-custom-trigger', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateForeignKey<Test> }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.foreignKey(props.table2.ref, props.table1,
          (dst: { id: string, ref: StateForeignKey<Test> },
            removed: Test) => {
            dst.ref.set("removed");
            expect(removed.id).toBe("42");
          });
      }
    });

  state.table1.insert({ id: "42", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateForeignKey<Test>("42") });

  state.table1.remove("42");
  expect(state.table2.size).toBe(1);
  expect(state.table2.get("1").ref.getId()).toBe("removed");

});


test('table-clone', () => {
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