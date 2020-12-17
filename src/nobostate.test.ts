import { createState, stateArray, stateObject, stateObjectArray, stateTable } from './nobostate';
import { StateTable } from './StateTable';
import { unwrapState } from './unwrap_revive';

function checkListenerCalled(state: any, key: any, fun: () => void) {
  let called = false;
  let dispose = state._subscribeKey(key, () => called = true);
  fun();
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
  state.todos.assertGet("1")._subscribeKey("nullable", nullable => {
    // console.log("call!!");
    expect(nullable).toBe(12);
    called = true;
  });

  state.todos.assertGet("1").nullable = 12;
  expect(state.todos.assertGet("1").nullable).toBe(12);

  expect(called).toBe(true);
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

  state._load({ _stateObject: {
    todos: { _stateTable: [ { _stateObject:  { id: "1", description: "test", nullable: 23 } }] }
  }});

  expect(state.todos.assertGet("1").id).toBe("1");
  expect(state.todos.assertGet("1").description).toBe("test");
  expect(state.todos.assertGet("1").nullable).toBe(23);
});

function subscribeCheck(state: any, key: any) {
  let called = false;
  state._subscribeKey(key, () => called = true);
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
  expect((state.todos[0])._props).toBeTruthy();

  let checkSubscribeOnElementUpdate = subscribeCheck(state.todos, 0);
  let checkSubscribeOnElementUpdate1 = subscribeCheck(state, "todos");
  state.todos[0].nullable = 12;
  checkSubscribeOnElementUpdate();
  checkSubscribeOnElementUpdate1();

  expect([...state.todos].length).toBe(1);
});

test('object-update', () => {
  let state = createState({ obj: stateObject({ id: "1", age: 12 }) });

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

test('undo-insert', () => {
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
  
  expect(state.todo.description).toBe("test");
});
