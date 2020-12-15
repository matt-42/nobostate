import { stateTable } from "./nobostate";
import { createPropIds, propagatePropIds } from "./prop";



test("props", () => {

  let table = stateTable<{id: number, x: string}>();
   
  expect(table._props).toBe(null);

  let propsIds = createPropIds();

  propsIds["a"]["b"]["c"];
  expect(propsIds["a"]._propId !== propsIds["b"]._propId).toBe(true);
  expect(propsIds["a"]._propId !== propsIds["c"]._propId).toBe(true);
  expect(propsIds["b"]._propId !== propsIds["c"]._propId).toBe(true);

  propagatePropIds(table, propsIds);

  table.insert({id: 1, x: ""});
  expect(table.assertGet(1)._props).toBeTruthy();
});