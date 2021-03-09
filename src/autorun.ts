import { StateBaseInterface } from "./StateBase";


type AutorunFunction = (() => void) | (() => () => void);

type AccessInfo = {
  state: StateBaseInterface<any>,
  key: string | null
}

let autorunTracking = true;

export function autorunIgnore<R>(f: () => R) {
  if (!currentAutorunContext) return f();

  autorunTracking = false;

  // console.log(">>>> autorunIgnore start");
  try {
    var res = f();
  }
  finally {
    autorunTracking = true;
  }
  // console.log("<<<< autorunIgnore end");
  return res;
}

class AccessInfoMap<V> {
  map = new Map<StateBaseInterface<any>, Map<string | null, V>>();

  has(info: AccessInfo) {
    return this.map.get(info.state)?.has(info.key) || false;
  }

  clear() { return this.map.clear(); }
  get(info: AccessInfo) {
    return this.map.get(info.state)?.get(info.key);
  }
  set(info: AccessInfo, val: V) {
    if (!autorunTracking) {
      // console.log("autorun ignore ", info.key);
      return;
    }

    let m1 = this.map.get(info.state);
    if (!m1) {
      m1 = new Map<string, V>();
      this.map.set(info.state, m1);
    }
    m1.set(info.key, val);
    return this;
  }
  delete(info: AccessInfo) {
    this.map.get(info.state)?.delete(info.key);
    return this;
  }
  forall(f: (pair: [AccessInfo, V]) => void) {

    for (let [state, m2] of this.map)
      for (let [key, value] of m2)
        f([{ state: state, key: key }, value]);
  }
}

interface AutorunContext {
  run: AutorunFunction,
  accesses: AccessInfoMap<boolean>
  disposers: AccessInfoMap<() => void>
}

const autorunContexts = new Map<AutorunFunction, AutorunContext>();

export let currentAutorunContext: AutorunContext | null = null;


export function autorun(f: AutorunFunction): () => void {

  // Run the function once.
  const oneRun = () => {

    if (currentAutorunContext) {
      // console.warn("Nested runs of autorun are forbidden.");
      return;
    }

    // retrieve the context.
    currentAutorunContext = autorunContexts.get(f) as AutorunContext;
    if (!currentAutorunContext)
      throw new Error("Internal nobostate error: missing autorun context");

    // console.log("START AUTORUN.");
    // run the autorun function
    const res = f();
    // console.log("AUTORUN END.");

    // currentAutorunContext.accesses.forall(pair => {
    // console.log("  got access to ", pair[0].key);
    // })
    // dispose to outdated subscribers.
    currentAutorunContext.disposers.forall(acc => {
      if (!currentAutorunContext?.accesses.has(acc[0])) {
        // console.log(`unsubscribe to ${acc[0].key}`);
        currentAutorunContext?.disposers.get(acc[0])?.();
        currentAutorunContext?.disposers.delete(acc[0]);
      }
    });
    // subsribe to new dependencies.
    currentAutorunContext.accesses.forall(acc => {
      if (!currentAutorunContext?.disposers.has(acc[0])) {
        // console.log(`subscribe to ${acc[0].key}`);
        const {state, key} = acc[0];
        if (key === null || (Array.isArray(state) && key === "length"))
          currentAutorunContext?.disposers.set({state, key: null}, state._subscribe(oneRun));
        else
          currentAutorunContext?.disposers.set(acc[0], state._subscribeKey(key, oneRun));
      }
    });

    // save previousAccesses.
    currentAutorunContext.accesses.clear();

    // clear current context.
    currentAutorunContext = null;

    return res;
  }

  let ctx = autorunContexts.get(f);
  if (!ctx) {
    ctx = {
      run: oneRun,
      accesses: new AccessInfoMap<boolean>(),
      disposers: new AccessInfoMap<() => void>()
    }
    autorunContexts.set(f, ctx as AutorunContext);
  }

  // Run the function once to get the dependencies.
  oneRun();

  return () => {
    ctx?.disposers.forall(f => f[1]());
    autorunContexts.delete(f);
  }


}