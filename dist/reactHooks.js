"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debouncedObserver = exports.observer = exports.useNoboObserver = exports.useNoboIds = exports.useNoboMapSelector = exports.useNoboRefKey = exports.useNoboRef = exports.useNoboSelector = exports.useNoboKeys = exports.useNoboKey = exports.useNoboStateImpl = exports.useRefreshThisComponent = exports.useMounted = exports.useNoboState = void 0;
const lodash_1 = __importDefault(require("lodash"));
const react_1 = require("react");
const autorun_1 = require("./autorun");
const unwrap_revive_1 = require("./unwrap_revive");
function useNoboState(state) {
    return useNoboStateImpl(state);
}
exports.useNoboState = useNoboState;
function useMounted() {
    const mounted = react_1.useMemo(() => { return { current: true }; }, []);
    react_1.useEffect(() => {
        return () => { mounted.current = false; };
    }, [mounted]);
    return mounted;
}
exports.useMounted = useMounted;
function useRefreshThisComponent() {
    let [, setVal] = react_1.useState(1);
    return react_1.useMemo(() => {
        let i = 2;
        return () => setVal(++i);
    }, []);
}
exports.useRefreshThisComponent = useRefreshThisComponent;
function useNoboStateImpl(state, prop) {
    const refresh = useRefreshThisComponent();
    const getValue = () => {
        if (prop === "__ref__")
            return state;
        else if (prop)
            return state._get(prop);
        else
            return state;
    };
    const [value, setValue] = react_1.useState(getValue());
    const mounted = useMounted();
    react_1.useEffect(() => {
        let listener = () => {
            if (mounted.current) {
                refresh();
                // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
                setValue(getValue());
            }
        };
        if (prop === "__ref__")
            return state._subscribeRef(listener);
        else if (prop)
            return state._subscribeKey(prop, listener);
        else
            return state._subscribe(listener);
    }, []);
    return value;
}
exports.useNoboStateImpl = useNoboStateImpl;
function useNoboKey(state_, key) {
    const state = state_;
    if (!state._isStateBase)
        throw new Error("state_ argument must be a nobostate object");
    let refresh = useRefreshThisComponent();
    const getValue = react_1.useCallback(() => state._get(key), []);
    const [value, setValue] = react_1.useState(getValue());
    const mounted = useMounted();
    react_1.useEffect(() => {
        let i = 0;
        let listener = lodash_1.default.throttle(() => {
            if (mounted.current) {
                refresh();
                // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
                setValue(getValue());
            }
        }, 16);
        return state._subscribeKey(key, listener);
    }, [mounted, setValue, key, getValue]);
    return value;
}
exports.useNoboKey = useNoboKey;
function useNoboKeys(state_, keys) {
    const state = state_;
    if (!state._isStateBase)
        throw new Error("state_ argument must be a nobostate object");
    const refresh = useRefreshThisComponent();
    const getValue = () => {
        let res = {};
        keys.forEach(k => res[k] = state._get(k));
        return res;
    };
    const [value, setValue] = react_1.useState(getValue());
    const mounted = useMounted();
    react_1.useEffect(() => {
        let listener = lodash_1.default.throttle(() => {
            if (mounted.current) {
                refresh();
                // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
                setValue(getValue());
            }
        }, 16);
        keys.forEach(k => state._subscribeKey(k, listener));
    }, []);
    return value;
}
exports.useNoboKeys = useNoboKeys;
function useNoboSelector(state, selector) {
    const refresh = useRefreshThisComponent();
    const [value, setValue] = react_1.useState(selector(state));
    const ctx = react_1.useMemo(() => { return { prev: null }; }, []);
    const getComparable = (x) => { var _a; return ((_a = x) === null || _a === void 0 ? void 0 : _a._isStateBase) ? unwrap_revive_1.unwrapState(x) : x; };
    const mounted = useMounted();
    react_1.useEffect(() => {
        return state._subscribe(lodash_1.default.throttle(() => {
            if (mounted.current) {
                let next = selector(state);
                let nextComparable = getComparable(next);
                if (!lodash_1.default.isEqual(ctx.prev, nextComparable)) {
                    ctx.prev = nextComparable;
                    refresh();
                    // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
                    setValue(next);
                }
            }
        }, 50, { trailing: true }));
    }, [mounted]);
    // Run the selector at every render to be sure we are in sync.
    let actualValue = selector(state);
    if (!lodash_1.default.isEqual(actualValue, value)) {
        setValue(actualValue);
        ctx.prev = actualValue;
        return actualValue;
    }
    return value;
    // if (actualValue)
}
exports.useNoboSelector = useNoboSelector;
function useNoboRef(state) {
    return useNoboStateImpl(state, "__ref__");
}
exports.useNoboRef = useNoboRef;
function useNoboRefKey(state, key) {
    // if (!prop)
    //   console.log("_use", state);
    const refresh = useRefreshThisComponent();
    const getValue = () => { var _a; return ((_a = state.ref) === null || _a === void 0 ? void 0 : _a._get(key)) || null; };
    const [value, setValue] = react_1.useState(getValue());
    const mounted = useMounted();
    react_1.useEffect(() => {
        let dispose = null;
        let listener = lodash_1.default.throttle(() => {
            var _a;
            // Ref changed.
            dispose === null || dispose === void 0 ? void 0 : dispose();
            dispose = ((_a = state.ref) === null || _a === void 0 ? void 0 : _a._subscribeKey(key, () => {
                if (mounted.current) {
                    refresh();
                    // setValue must be called after refresh otherwise it misses refreshes in react-tree-fiber
                    setValue(getValue());
                }
            }, true)) || null;
        }, 16);
        return state._subscribeRef(listener);
    }, [mounted]);
    return value;
}
exports.useNoboRefKey = useNoboRefKey;
function useNoboMapSelector(table, mapSelector) {
    return useNoboSelector(table, table => [...table.values()].map(mapSelector));
}
exports.useNoboMapSelector = useNoboMapSelector;
function useNoboIds(table) {
    const [ids, setIds] = react_1.useState(table.ids());
    react_1.useEffect(() => {
        return table._subscribeIds(setIds);
    }, []);
    return ids;
    // This use to be simpler with useSelector but the selector is also run of every update
    // of every table object which is useless.
    // return this._useSelector(table => [...table.keys()]); 
}
exports.useNoboIds = useNoboIds;
const refreshQueue = [];
let refreshTimeout = null;
function flushRefreshQueue() {
    // console.log("==== FLUSH REFRESH QUEUE =====", refreshQueue.length);
    if (refreshQueue.length === 0)
        return;
    // console.log("==== FLUSH REFRESH QUEUE =====");
    refreshTimeout = null;
    while (refreshQueue.length) {
        const elt = refreshQueue.shift();
        if (!elt)
            continue;
        // for (let elt of refreshQueue) {
        if (elt[0].current) {
            // console.log(`====  FLUSH REFRESH QUEUE : ${elt[2]} =====`);
            elt[1]();
        }
        else {
            // console.log(`====  FLUSH REFRESH QUEUE : skip ${elt[2]} =====`);
        }
    }
    refreshQueue.length = 0;
    // console.log("==== END OF FLUSH REFRESH QUEUE =====");
    // const elt = refreshQueue.shift();
    // if (!elt) return;
    // if (elt[0].current) 
    // {
    //   console.log(`====  FLUSH REFRESH QUEUE : ${elt[2]} =====`);
    //   elt[1]();
    // }
    // else {
    //   console.log(`====  FLUSH REFRESH QUEUE : skip ${elt[2]} =====`);
    // }
    // refreshTimeout = setTimeout(flushRefreshQueue, 10);
}
function triggerRefresh() {
    if (refreshTimeout === null)
        refreshTimeout = setTimeout(flushRefreshQueue, 300);
}
function useNoboObserver(f, name) {
    const valueAtLastRender = react_1.useRef();
    const [state, setState] = react_1.useState(f());
    const dirty = react_1.useRef(true);
    // const refresh = useCallback(() => {
    //   if (!_.isEqual(newVal, valueAtLastRender.current))
    //   return setState(newVal); 
    // }, []);
    react_1.useEffect(() => {
        return autorun_1.autorun(() => {
            const newVal = f();
            if (!lodash_1.default.isEqual(newVal, valueAtLastRender.current)) {
                dirty.current = true;
                refreshQueue.push([dirty, () => {
                        return setState(newVal);
                    }, name || "unknown"]);
                triggerRefresh();
            }
        });
    }, []);
    // when rerendering, refresh the ref.
    valueAtLastRender.current = f();
    dirty.current = false;
    return valueAtLastRender.current;
    // return state;
}
exports.useNoboObserver = useNoboObserver;
function observer(component, name) {
    let firstCall = true;
    return (props) => {
        const refresh = useRefreshThisComponent();
        const reaction = react_1.useMemo(() => new autorun_1.Reaction(() => {
            // console.log("Observer::refresh ", name);
            refresh();
        }), []);
        react_1.useEffect(() => () => reaction.dispose(), []);
        // console.log("Observer::render ", name, firstCall);
        firstCall = false;
        return reaction.track(() => component(props), name) || null;
    };
}
exports.observer = observer;
function debouncedObserver(component, name, waitMs) {
    let firstCall = true;
    return (props) => {
        // Todo: 
        //    in case of nested observers, avoid dupplicate renders.
        //    idea:
        //        instead of refreshing in the reaction.
        //        push the refresh callback into a queue and mark the component as dirty.
        //        when to run the refresh ?
        //          set a timeout to flush the refresh queue.
        //          when flushing the queue, we mark components as clean so they are not rendered twice.
        //          before flushing the queue, sort the components with respect to the hierarchy.
        //               maybe they are already sorted ?
        const dirty = react_1.useRef(false);
        // const refresh = _.debounce(useRefreshThisComponent(), waitMs);
        const refresh = useRefreshThisComponent();
        const reaction = react_1.useMemo(() => new autorun_1.Reaction(() => {
            // console.log("Observer::refresh ", name);
            // refresh(); 
            refreshQueue.push([dirty, refresh, name || component.name]);
            dirty.current = true;
            triggerRefresh();
        }), [dirty]);
        react_1.useEffect(() => () => reaction.dispose(), []);
        // console.log("Observer::render ", name, firstCall);
        dirty.current = false;
        firstCall = false;
        return reaction.track(() => component(props), name) || null;
    };
}
exports.debouncedObserver = debouncedObserver;
//# sourceMappingURL=reactHooks.js.map