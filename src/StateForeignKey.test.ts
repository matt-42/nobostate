import { createState, stateTable } from "./nobostate";
import { stateForeignKey, StateForeignKey } from "./StateForeignKey";

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

  let ref = state.table2.assertGet("1").ref;

  expect(state.table2.assertGet("1").ref.id).toBe("1");
  expect(state.table2.assertGet("1").ref.text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.assertGet("1").ref.id).toBe(undefined);

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

  expect(state.table2.assertGet("1").ref.id).toBe("1");
  expect(state.table2.assertGet("1").ref.text).toBe("xxx");

  state.table1.remove("1");
  expect(state.table2.size).toBe(1);

});

test('foreign-key-custom-trigger', () => {

  let state = createState({
    table1: stateTable<Test>(),
    table2: stateTable<{ id: string, ref: StateForeignKey<Test>, x : number }>(),
  },
    {
      setSpecs: (props, specs) => {
        specs.foreignKey(props.table2.ref, props.table1,
          (dst, removed) => {
            dst.ref._set(null);
            dst.x = 1;
            expect(removed.id).toBe("42");
          });
      }
    });

  state.table1.insert({ id: "42", text: "xxx" });
  state.table2.insert({ id: "1", ref: stateForeignKey<Test>("42"), x: 0 });

  state.table1.remove("42");
  expect(state.table2.size).toBe(1);
  expect(state.table2.get("1").ref.id).toBe(undefined);
  expect(state.table2.get("1").x).toBe(1);

});

