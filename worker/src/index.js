var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../../../root/.npm/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/webhook/verify.js
async function verifyWebhookSignature(rawBody, hmacHeader, secret) {
  if (!rawBody || !hmacHeader || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return timingSafeEqual(b64, hmacHeader);
}
__name(verifyWebhookSignature, "verifyWebhookSignature");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
async function recordEvent(db, { shopify_webhook_id, shopify_event_id, event_type, payload_hash }) {
  try {
    await db.prepare(
      `INSERT INTO events (shopify_webhook_id, shopify_event_id, event_type, payload_hash)
       VALUES (?, ?, ?, ?)`
    ).bind(shopify_webhook_id || null, shopify_event_id || null, event_type, payload_hash || null).run();
    return { first_time: true };
  } catch (e) {
    const msg = String(e && e.message || e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return { first_time: false, reason: "duplicate_event" };
    }
    throw e;
  }
}
__name(recordEvent, "recordEvent");
function parseOrderWebhook(payload) {
  if (!payload || payload.id == null) return null;
  const items = (payload.line_items || []).map((li) => ({
    shopify_product_id: String(li.product_id ?? ""),
    shopify_variant_id: String(li.variant_id ?? ""),
    title: li.title,
    sku: li.sku,
    quantity: li.quantity,
    customer_price: Number(li.price)
  }));
  return {
    shopify_order_id: String(payload.id),
    order_number: payload.order_number != null ? String(payload.order_number) : null,
    financial_status: payload.financial_status,
    cancelled_at: payload.cancelled_at || null,
    customer: {
      name: [payload.customer?.first_name, payload.customer?.last_name].filter(Boolean).join(" ") || null,
      email: payload.customer?.email || payload.email || null,
      phone: payload.customer?.phone || payload.shipping_address?.phone || null
    },
    shipping_address: payload.shipping_address || null,
    total_price: Number(payload.total_price),
    currency: payload.currency,
    items
  };
}
__name(parseOrderWebhook, "parseOrderWebhook");

// src/do/procurement_lock.js
var ProcurementLock = class {
  static {
    __name(this, "ProcurementLock");
  }
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.slice(1);
    if (action === "acquire") {
      const holder = await this.state.storage.get("holder") || null;
      if (holder) {
        return Response.json({ acquired: false, holder, reason: "already_in_flight" });
      }
      const holderInfo = {
        at: (/* @__PURE__ */ new Date()).toISOString(),
        source: request.headers.get("X-Source") || "unknown"
      };
      await this.state.storage.put("holder", holderInfo);
      return Response.json({ acquired: true, holder: holderInfo });
    }
    if (action === "release") {
      await this.state.storage.delete("holder");
      return Response.json({ released: true });
    }
    if (action === "status") {
      return Response.json({ holder: await this.state.storage.get("holder") || null });
    }
    return new Response("bad_action", { status: 400 });
  }
};
async function withProcurementLock(env2, shopifyOrderId, source, fn) {
  const id = env2.PROCUREMENT_LOCK.idFromName(`ORDER-${shopifyOrderId}`);
  const stub = env2.PROCUREMENT_LOCK.get(id);
  const res = await stub.fetch("https://lock/acquire", {
    headers: { "X-Source": source }
  }).then((r) => r.json());
  if (!res.acquired) {
    return { ran: false, reason: "procurement_already_in_flight", holder: res.holder };
  }
  try {
    const result = await fn();
    return { ran: true, result };
  } finally {
    await stub.fetch("https://lock/release").catch(() => {
    });
  }
}
__name(withProcurementLock, "withProcurementLock");

// src/core/status.js
var CANONICAL_ALIASES = {
  RECEIVED: "NEW",
  VALIDATING: "PROCESSING",
  AWAITING_PAYMENT: "PAYMENT_PENDING_SUPPLIER",
  FULFILLMENT_PENDING: "TRACKING_PENDING",
  SUPPLIER_UNAVAILABLE: "SUPPLIER_ERROR",
  PURCHASE_FAILED: "PAYMENT_FAILED",
  REFUND_REQUIRED: "REFUND_PENDING"
};
function canonicalStatus(s) {
  return CANONICAL_ALIASES[s] || s;
}
__name(canonicalStatus, "canonicalStatus");
var STATUS = {
  NEW: "NEW",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  APPROVED: "APPROVED",
  CHECKOUT_READY: "CHECKOUT_READY",
  PAYMENT_PENDING_SUPPLIER: "PAYMENT_PENDING_SUPPLIER",
  PURCHASED: "PURCHASED",
  TRACKING_PENDING: "TRACKING_PENDING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  BLOCKED: "BLOCKED",
  PRICE_CHANGED: "PRICE_CHANGED",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  MAPPING_REQUIRED: "MAPPING_REQUIRED",
  SUPPLIER_ERROR: "SUPPLIER_ERROR",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CANCELLED: "CANCELLED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED"
};
var TRANSITIONS = {
  [STATUS.NEW]: [STATUS.PAYMENT_PENDING, STATUS.PAID, STATUS.CANCELLED],
  [STATUS.PAYMENT_PENDING]: [STATUS.PAID, STATUS.CANCELLED, STATUS.BLOCKED],
  [STATUS.PAID]: [STATUS.PROCESSING, STATUS.REFUND_PENDING],
  [STATUS.PROCESSING]: [
    STATUS.READY_FOR_APPROVAL,
    STATUS.BLOCKED,
    STATUS.PRICE_CHANGED,
    STATUS.OUT_OF_STOCK,
    STATUS.MAPPING_REQUIRED,
    STATUS.SUPPLIER_ERROR
  ],
  [STATUS.READY_FOR_APPROVAL]: [STATUS.APPROVED, STATUS.CANCELLED, STATUS.BLOCKED],
  [STATUS.APPROVED]: [STATUS.CHECKOUT_READY, STATUS.REAPPROVAL_REQUIRED_DUMMY, STATUS.SUPPLIER_ERROR],
  [STATUS.CHECKOUT_READY]: [STATUS.PAYMENT_PENDING_SUPPLIER, STATUS.SUPPLIER_ERROR],
  [STATUS.PAYMENT_PENDING_SUPPLIER]: [STATUS.PURCHASED, STATUS.PAYMENT_FAILED, STATUS.BLOCKED],
  [STATUS.PURCHASED]: [STATUS.TRACKING_PENDING, STATUS.REFUND_PENDING, STATUS.BLOCKED],
  [STATUS.TRACKING_PENDING]: [STATUS.SHIPPED],
  [STATUS.SHIPPED]: [STATUS.DELIVERED],
  [STATUS.DELIVERED]: [STATUS.COMPLETED],
  // failure states may be reached from anywhere a hard failure occurs
  [STATUS.BLOCKED]: [STATUS.PROCESSING, STATUS.CANCELLED, STATUS.REFUND_PENDING],
  [STATUS.PRICE_CHANGED]: [STATUS.PROCESSING, STATUS.CANCELLED, STATUS.REFUND_PENDING],
  [STATUS.OUT_OF_STOCK]: [STATUS.CANCELLED, STATUS.REFUND_PENDING],
  [STATUS.MAPPING_REQUIRED]: [STATUS.PROCESSING, STATUS.CANCELLED],
  [STATUS.SUPPLIER_ERROR]: [STATUS.PROCESSING, STATUS.CANCELLED, STATUS.REFUND_PENDING],
  [STATUS.PAYMENT_FAILED]: [STATUS.PAYMENT_PENDING_SUPPLIER, STATUS.CANCELLED, STATUS.REFUND_PENDING],
  [STATUS.CANCELLED]: [STATUS.REFUND_PENDING],
  [STATUS.REFUND_PENDING]: [STATUS.REFUNDED],
  [STATUS.REFUNDED]: [],
  [STATUS.COMPLETED]: []
};
delete TRANSITIONS[STATUS.APPROVED];
TRANSITIONS[STATUS.APPROVED] = [STATUS.CHECKOUT_READY, STATUS.SUPPLIER_ERROR, STATUS.CANCELLED];
function canTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
__name(canTransition, "canTransition");
function procurementGate({ financial_status, cancelled_at, status }) {
  if (cancelled_at || status === STATUS.CANCELLED || status === STATUS.REFUND_PENDING) {
    return { allowed: false, reason: "order:cancelled" };
  }
  if (financial_status !== "paid") {
    return { allowed: false, reason: `order:financial_status=${financial_status || "unknown"}` };
  }
  return { allowed: true, reason: null };
}
__name(procurementGate, "procurementGate");

// src/pricing/engine.js
var DEFAULT_SETTINGS = {
  pricing_rules: {
    markup_tiers: [
      { min: 0, max: 100, markup_target: 15 },
      { min: 100, max: 250, markup_target: 13 },
      { min: 250, max: 500, markup_target: 12 },
      { min: 500, max: null, markup_target: 10 }
    ]
  },
  profit_guard: { minimum_net_profit: 10, minimum_net_margin: 4 },
  fees: { payment_fee_percent: 0.025, fixed_payment_fee: 1, shopify_fee_percent: 0.02 },
  pricing_rounding: { mode: "charm_up", max_round_up: 5, min_price_step: 1 },
  price_ceiling: { max_markup: 35, max_price: 1e5, max_market_deviation: 25 }
};
function resolveSettings(partial = {}) {
  const s = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    s[key] = { ...def, ...partial[key] || {} };
  }
  return s;
}
__name(resolveSettings, "resolveSettings");
function markupTierFor(supplierPrice, pricingRules) {
  const tiers = pricingRules && pricingRules.markup_tiers || [];
  for (const t of tiers) {
    const aboveMin = supplierPrice >= (t.min ?? 0);
    const belowMax = t.max == null || supplierPrice < t.max;
    if (aboveMin && belowMax) return t.markup_target / 100;
  }
  return null;
}
__name(markupTierFor, "markupTierFor");
function applyPsychologicalPricing(rawPrice, rounding = DEFAULT_SETTINGS.pricing_rounding) {
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;
  const step = rounding.min_price_step || 1;
  if (rounding.mode === "charm_up") {
    const nextTen = Math.ceil(rawPrice / 10) * 10;
    const charm = Math.max(nextTen - 1, Math.ceil(rawPrice));
    if (charm - rawPrice > (rounding.max_round_up ?? 5)) {
      return Math.ceil(rawPrice / step) * step;
    }
    return charm;
  }
  return Math.ceil(rawPrice / step) * step;
}
__name(applyPsychologicalPricing, "applyPsychologicalPricing");
function calculateRequiredSellingPrice(input, settings) {
  const s = resolveSettings(settings);
  const {
    supplier_cost,
    // supplier unit price x qty
    supplier_shipping = 0,
    supplier_fees = 0,
    target_net_profit,
    // ILS
    target_net_margin,
    // percent, e.g. 4 => 4%
    other_costs = 0
  } = input;
  const bad = [];
  for (const [name, v] of Object.entries({ supplier_cost, target_net_profit, target_net_margin })) {
    if (!Number.isFinite(v) || v < 0) bad.push(`invalid:${name}`);
  }
  if (bad.length) return { ok: false, status: "PRICE_BLOCKED", reasons: bad };
  const fees = s.fees;
  const variableRate = fees.payment_fee_percent + fees.shopify_fee_percent;
  const fixed = fees.fixed_payment_fee;
  const landed = supplier_cost + supplier_shipping + supplier_fees + other_costs;
  const forProfit = (landed + fixed + target_net_profit) / (1 - variableRate);
  const m = target_net_margin / 100;
  const denom = 1 - variableRate - m;
  const forMargin = denom > 0 ? (landed + fixed) / denom : Infinity;
  if (!Number.isFinite(forProfit)) {
    return { ok: false, status: "PRICE_BLOCKED", reasons: ["unfeasible:variable_rate"] };
  }
  const rawRequired = Math.max(forProfit, forMargin);
  const recommended = applyPsychologicalPricing(rawRequired, s.pricing_rounding);
  const breakdown = computeProfitBreakdown(
    {
      customer_unit_price: recommended,
      quantity: 1,
      supplier_unit_cost: supplier_cost / Math.max(1, input.qty || 1),
      supplier_shipping,
      supplier_fees,
      other_costs
    },
    settings
  );
  return {
    ok: true,
    raw_required_price: round2(rawRequired),
    recommended_store_price: recommended,
    breakdown
    // markup / gross / net / margin, all separated (Section 3)
  };
}
__name(calculateRequiredSellingPrice, "calculateRequiredSellingPrice");
function evaluatePrice({
  supplier_cost,
  supplier_shipping = 0,
  supplier_fees = 0,
  other_costs = 0,
  customer_price,
  quantity = 1,
  market_price = null
}, settings) {
  const s = resolveSettings(settings);
  const reasons = [];
  if (!Number.isFinite(customer_price) || customer_price <= 0) {
    return { status: "PRICE_BLOCKED", reasons: ["invalid:customer_price"] };
  }
  if (!Number.isFinite(supplier_cost) || supplier_cost <= 0) {
    return { status: "PRICE_BLOCKED", reasons: ["invalid:supplier_cost"] };
  }
  const breakdown = computeProfitBreakdown(
    {
      customer_unit_price: customer_price,
      quantity,
      supplier_unit_cost: supplier_cost,
      supplier_shipping,
      supplier_fees,
      other_costs
    },
    settings
  );
  const g = s.profit_guard;
  if (breakdown.net_profit < g.minimum_net_profit) reasons.push(`guard:min_net_profit(${g.minimum_net_profit})`);
  if (breakdown.net_margin < g.minimum_net_margin) reasons.push(`guard:min_net_margin(${g.minimum_net_margin})`);
  if (reasons.length) return { status: "PRICE_BLOCKED", reasons, breakdown };
  const c = s.price_ceiling;
  if (breakdown.markup > c.max_markup) reasons.push(`ceiling:max_markup(${c.max_markup})`);
  if (customer_price > c.max_price) reasons.push(`ceiling:max_price(${c.max_price})`);
  if (market_price != null && market_price > 0) {
    const dev = (customer_price - market_price) / market_price * 100;
    if (dev > c.max_market_deviation) reasons.push(`ceiling:market_deviation(${round2(dev)}%)`);
  }
  if (reasons.length) return { status: "PRICE_REVIEW", reasons, breakdown };
  return { status: "ACTIVE", reasons: [], breakdown };
}
__name(evaluatePrice, "evaluatePrice");
function simulatePricing({
  supplier_cost,
  supplier_shipping = 0,
  supplier_fees = 0,
  current_price,
  quantity = 1,
  market_price = null
}, settings) {
  const s = resolveSettings(settings);
  const tier = markupTierFor(supplier_cost, s.pricing_rules);
  if (tier == null) {
    return { status: "PRICE_BLOCKED", reasons: ["no_pricing_tier"], current: null, recommended: null };
  }
  const g = s.profit_guard;
  const rec = calculateRequiredSellingPrice(
    {
      supplier_cost: supplier_cost * quantity,
      supplier_shipping,
      supplier_fees,
      target_net_profit: Math.max(g.minimum_net_profit, supplier_cost * quantity * tier * 0.9),
      target_net_margin: g.minimum_net_margin
    },
    settings
  );
  const current = evaluatePrice({
    supplier_cost: supplier_cost * quantity,
    supplier_shipping,
    supplier_fees,
    customer_price: current_price,
    quantity,
    market_price
  }, settings);
  if (!rec.ok) {
    return { status: rec.status, reasons: rec.reasons, current: current.breakdown || current, recommended: null };
  }
  const recommendedEval = evaluatePrice({
    supplier_cost: supplier_cost * quantity,
    supplier_shipping,
    supplier_fees,
    customer_price: rec.recommended_store_price,
    quantity,
    market_price
  }, settings);
  return {
    status: recommendedEval.status === "ACTIVE" ? "RECOMMENDED_OK" : recommendedEval.status,
    current: current.breakdown || current,
    recommended: recommendedEval.breakdown || recommendedEval,
    recommended_price: rec.recommended_store_price,
    difference: round2(rec.recommended_store_price - current_price)
  };
}
__name(simulatePricing, "simulatePricing");
function round2(x) {
  return Math.round(x * 100) / 100;
}
__name(round2, "round2");

// src/pricing/profit.js
function computeFees(customerRevenue, settings) {
  const s = resolveSettings(settings);
  const f = s.fees;
  if (!Number.isFinite(customerRevenue) || customerRevenue < 0) {
    return { ok: false, reasons: ["invalid:revenue"] };
  }
  const paymentFee = customerRevenue * f.payment_fee_percent + f.fixed_payment_fee;
  const shopifyFee = customerRevenue * f.shopify_fee_percent;
  return {
    ok: true,
    payment_fee: r2(paymentFee),
    shopify_fee: r2(shopifyFee),
    total: r2(paymentFee + shopifyFee)
  };
}
__name(computeFees, "computeFees");
function computeProfitBreakdown({
  customer_unit_price,
  quantity = 1,
  supplier_unit_cost,
  supplier_shipping = 0,
  supplier_fees = 0,
  other_costs = 0
}, settings) {
  const s = resolveSettings(settings);
  if (!Number.isFinite(customer_unit_price) || !Number.isFinite(supplier_unit_cost) || quantity <= 0 || customer_unit_price <= 0 || supplier_unit_cost < 0) {
    return { ok: false, reasons: ["invalid:inputs"] };
  }
  const revenue = customer_unit_price * quantity;
  const supplierCost = supplier_unit_cost * quantity;
  const { payment_fee, shopify_fee } = computeFees(revenue, s);
  const grossProfit = revenue - supplierCost;
  const netProfit = revenue - supplierCost - supplier_shipping - supplier_fees - payment_fee - shopify_fee - other_costs;
  const netMargin = netProfit / revenue * 100;
  const markup = supplierCost > 0 ? grossProfit / supplierCost * 100 : null;
  return {
    ok: true,
    customer_revenue: r2(revenue),
    supplier_cost: r2(supplierCost),
    supplier_shipping: r2(supplier_shipping),
    supplier_fees: r2(supplier_fees),
    payment_fee: r2(payment_fee),
    shopify_fee: r2(shopify_fee),
    other_costs: r2(other_costs),
    // separated per spec:
    markup: markup == null ? null : r2(markup),
    gross_profit: r2(grossProfit),
    net_profit: r2(netProfit),
    net_margin: r2(netMargin)
  };
}
__name(computeProfitBreakdown, "computeProfitBreakdown");
function r2(x) {
  return Math.round(x * 100) / 100;
}
__name(r2, "r2");

// src/core/risk.js
var HOUR_MS = 3600 * 1e3;
function ageHours(iso, now = Date.now()) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (now - t) / HOUR_MS;
}
__name(ageHours, "ageHours");
function verifyPrice({
  live_supplier_price,
  allowed_price_change_percent,
  live_checked_at,
  price_check_max_age_hours,
  listed_supplier_price,
  expected_net_profit_input
}, now = Date.now()) {
  const reasons = [];
  if (!Number.isFinite(live_supplier_price)) {
    return { status: "BLOCKED", reasons: ["price:unknown"] };
  }
  if (live_checked_at == null || ageHours(live_checked_at, now) > price_check_max_age_hours) {
    return { status: "RECHECK_REQUIRED", reasons: ["price:stale_check"] };
  }
  if (listed_supplier_price != null && Number.isFinite(listed_supplier_price)) {
    const changePct = (live_supplier_price - listed_supplier_price) / listed_supplier_price * 100;
    if (changePct > allowed_price_change_percent) {
      return {
        status: "REAPPROVAL_REQUIRED",
        reasons: [`price:rose_${changePct.toFixed(1)}%`],
        change_percent: Math.round(changePct * 100) / 100
      };
    }
  }
  return { status: "OK", reasons: [], live_supplier_price };
}
__name(verifyPrice, "verifyPrice");
function verifyStock({ stock, quantity, checked_at, stock_check_max_age_hours }, now = Date.now()) {
  if (!Number.isFinite(stock)) return { status: "BLOCKED", reasons: ["stock:unknown"] };
  if (checked_at == null || ageHours(checked_at, now) > stock_check_max_age_hours) {
    return { status: "RECHECK_REQUIRED", reasons: ["stock:stale_check"] };
  }
  if (stock < quantity) {
    return { status: "BLOCKED", reasons: [`stock:insufficient(${stock}<${quantity})`] };
  }
  return { status: "OK", reasons: [] };
}
__name(verifyStock, "verifyStock");

// src/core/ingest.js
// SPORTPRO PHASE 1A: fail-closed kill switch.
// Only two values allow anything: the canonical JSON {"active":false} (or legacy "OFF" / {"active":0}).
// Everything else (ON, missing row, malformed value, read error) means BLOCK.
function parseKillSwitch(raw) {
  if (raw === null || raw === undefined) return { state: "INVALID", reason: "missing" };
  const s = typeof raw === "string" ? raw.trim() : raw;
  if (s === "ON") return { state: "ON", reason: "legacy_string_on" };
  if (s === "OFF") return { state: "OFF", reason: "legacy_string_off" };
  let v = s;
  if (typeof s === "string") {
    try { v = JSON.parse(s); } catch { return { state: "INVALID", reason: "malformed" }; }
  }
  if (!v || typeof v !== "object" || Array.isArray(v) || !("active" in v)) return { state: "INVALID", reason: "malformed" };
  if (v.active === true || v.active === 1) return { state: "ON", reason: "active" };
  if (v.active === false || v.active === 0) return { state: "OFF", reason: "inactive" };
  return { state: "INVALID", reason: "ambiguous_active_value" };
}
__name(parseKillSwitch, "parseKillSwitch");
async function readKillSwitch(db) {
  try {
    const row = await db.prepare(`SELECT value FROM system_settings WHERE key = 'kill_switch'`).first();
    if (!row) return { state: "INVALID", reason: "missing" };
    return parseKillSwitch(row.value);
  } catch (e) {
    return { state: "INVALID", reason: "read_error" };
  }
}
__name(readKillSwitch, "readKillSwitch");
async function killSwitchBlock(db, action) {
  const ks = await readKillSwitch(db);
  if (ks.state === "OFF") return null;
  return Response.json(
    { error: "kill_switch_blocked", action, kill_switch: ks.state, reason: ks.reason },
    { status: 423 }
  );
}
__name(killSwitchBlock, "killSwitchBlock");
// SPORTPRO: single central guard for every money / write action.
// Order: kill switch -> action preconditions -> SELLABLE gate. Anything not explicitly allowed is blocked.
// The SELLABLE gate (src/core/eligibility.js + actionGuard.js) is not wired into this legacy schema,
// so REAL (non-test) orders are blocked until it is. Only is_test orders may move (staging E2E).
const GUARDED_ACTIONS = ["approval_1", "approval_2", "checkout_draft", "purchase", "shopify_mutation"];
async function guardAction(db, env2, action, ctx = {}) {
  if (!GUARDED_ACTIONS.includes(action)) return { ok: false, error: "unknown_action", action };
  const ks = await readKillSwitch(db);
  if (ks.state !== "OFF") return { ok: false, status: 423, error: "kill_switch_blocked", action, kill_switch: ks.state, reason: ks.reason };
  if (action === "shopify_mutation") {
    if (!env2 || env2.SHOPIFY_WRITES_ENABLED !== "true") return { ok: false, error: "writes_disabled", action };
    return { ok: true };
  }
  const so = ctx.so;
  if (!so) return { ok: false, status: 404, error: "not_found", action };
  if (so.is_test !== 1) return { ok: false, status: 423, error: "sellable_gate_required", action, reason: "real_orders_blocked_until_sellable_gate_is_wired" };
  return { ok: true };
}
__name(guardAction, "guardAction");
function guardResponse(g) {
  const { ok, status, ...rest } = g;
  return Response.json(rest, { status: status || 423 });
}
__name(guardResponse, "guardResponse");
async function getSettings(db) {
  const rows = await db.prepare("SELECT key, value FROM system_settings").all();
  const s = {};
  for (const r of rows.results || []) {
    try {
      s[r.key] = JSON.parse(r.value);
    } catch {
      s[r.key] = r.value;
    }
  }
  return s;
}
__name(getSettings, "getSettings");
async function resolveMapping(db, shopifyVariantId) {
  const rows = await db.prepare(
    `SELECT m.*, s.code AS supplier_code, s.status AS supplier_status,
            s.paused AS supplier_paused, s.reliability_score
     FROM product_mappings m JOIN suppliers s ON s.id = m.supplier_id
     WHERE m.shopify_variant_id = ?
     ORDER BY (m.status = 'VERIFIED') DESC, m.mapping_confidence DESC
     LIMIT 5`
  ).bind(shopifyVariantId).all();
  return (rows.results || []).filter((m) => m.status === "MANUAL_VERIFIED" && m.supplier_status === "ACTIVE" && !m.supplier_paused);
}
__name(resolveMapping, "resolveMapping");
async function ingestOrder(db, parsed, settings) {
  const gate = procurementGate(parsed);
  if (!gate.allowed) {
    return { accepted: true, procured: false, reason: gate.reason };
  }
  if ((await readKillSwitch(db)).state !== "OFF") {
    await insertOrder(db, parsed, STATUS.PAID, settings, {
      kill_switch_queued: 1,
      blocked_reason: "kill_switch:queued"
    });
    return { accepted: true, procured: false, reason: "kill_switch_active:queued" };
  }
  const existing = await db.prepare("SELECT id, status FROM orders WHERE shopify_order_id = ?").bind(parsed.shopify_order_id).first();
  if (existing) {
    return { accepted: true, procured: false, reason: `duplicate_order:${existing.status}` };
  }
  const orderId = await insertOrder(db, parsed, STATUS.PAID, settings, {});
  const groups = /* @__PURE__ */ new Map();
  const unresolved = [];
  for (const item of parsed.items) {
    const mappings = await resolveMapping(db, item.shopify_variant_id);
    if (!mappings.length) {
      unresolved.push(item.title || item.shopify_variant_id);
      continue;
    }
    const chosen = mappings[0];
    if (!groups.has(chosen.supplier_code)) groups.set(chosen.supplier_code, []);
    groups.get(chosen.supplier_code).push({ item, mapping: chosen });
  }
  if (unresolved.length) {
    await db.prepare(
      `INSERT INTO automation_log (order_id, step, status, blocked_reason)
       VALUES (?, 'split_by_supplier', 'BLOCKED', ?)`
    ).bind(orderId, `mapping_required:${unresolved.join("|").slice(0, 300)}`).run();
    await updateOrderStatus(
      db,
      orderId,
      STATUS.MAPPING_REQUIRED,
      `mapping_required:${unresolved.join("|").slice(0, 300)}`
    );
    return {
      accepted: true,
      procured: false,
      order_id: orderId,
      status: STATUS.MAPPING_REQUIRED,
      unresolved
    };
  }
  const supplierOrderIds = [];
  for (const [code, entries] of groups) {
    let supplierSubtotal = 0;
    const itemsJson = [];
    for (const { item, mapping } of entries) {
      await db.prepare(
        `INSERT INTO order_items (order_id, shopify_product_id, shopify_variant_id,
           title, sku, quantity, customer_price, supplier_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        orderId,
        item.shopify_product_id,
        item.shopify_variant_id,
        item.title,
        item.sku,
        item.quantity,
        item.customer_price,
        code
      ).run();
      supplierSubtotal += (mapping.supplier_price || 0) * item.quantity;
      itemsJson.push({
        ...item,
        supplier_sku: mapping.supplier_sku,
        supplier_variant_id: mapping.supplier_variant_id
      });
    }
    const customerRevenue = entries.reduce((a, e) => a + e.item.customer_price * e.item.quantity, 0);
    const b = computeProfitBreakdown(
      {
        customer_unit_price: customerRevenue,
        quantity: 1,
        supplier_unit_cost: supplierSubtotal,
        supplier_shipping: 0
      },
      settings
    );
    const res = await db.prepare(
      `INSERT INTO supplier_orders (order_id, supplier_id, status, items,
         supplier_subtotal, supplier_total, customer_revenue,
         expected_net_profit, expected_net_margin)
       VALUES (?, (SELECT id FROM suppliers WHERE code = ?), 'PENDING', ?, ?, ?, ?, ?, ?)`
    ).bind(
      orderId,
      code,
      JSON.stringify(itemsJson),
      supplierSubtotal,
      supplierSubtotal,
      customerRevenue,
      b.ok ? b.net_profit : null,
      b.ok ? b.net_margin : null
    ).run();
    supplierOrderIds.push(res.meta?.last_row_id);
    if (b.ok) {
      await db.prepare(
        `INSERT INTO profit_snapshots (order_id, supplier_order_id, stage,
           customer_price, supplier_price, payment_fee, shopify_fee,
           net_profit, net_margin)
         VALUES (?, ?, 'ORDER', ?, ?, ?, ?, ?, ?)`
      ).bind(
        orderId,
        res.meta?.last_row_id,
        b.customer_revenue,
        b.supplier_cost,
        b.payment_fee,
        b.shopify_fee,
        b.net_profit,
        b.net_margin
      ).run();
    }
  }
  await updateOrderStatus(db, orderId, STATUS.PROCESSING, null);
  return {
    accepted: true,
    procured: true,
    order_id: orderId,
    supplier_orders: supplierOrderIds,
    split: Object.fromEntries(groups)
  };
}
__name(ingestOrder, "ingestOrder");
async function insertOrder(db, parsed, status, settings, extra) {
  const res = await db.prepare(
    `INSERT INTO orders (shopify_order_id, order_number, customer_name, customer_email,
       customer_phone, shipping_address, total_price, currency,
       financial_status, status, kill_switch_queued, blocked_reason, created_at_shopify)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    parsed.shopify_order_id,
    parsed.order_number,
    parsed.customer.name,
    parsed.customer.email,
    parsed.customer.phone,
    JSON.stringify(parsed.shipping_address || null),
    parsed.total_price,
    parsed.currency,
    parsed.financial_status,
    status,
    extra.kill_switch_queued || 0,
    extra.blocked_reason || null,
    (/* @__PURE__ */ new Date()).toISOString()
  ).run();
  return res.meta?.last_row_id;
}
__name(insertOrder, "insertOrder");
async function updateOrderStatus(db, orderId, status, reason) {
  await db.prepare("UPDATE orders SET status = ?, blocked_reason = ?, updated_at = datetime('now') WHERE id = ?").bind(status, reason, orderId).run();
}
__name(updateOrderStatus, "updateOrderStatus");

// src/shopify/auth.js
var TOKEN_URL = /* @__PURE__ */ __name((shopDomain) => `https://${shopDomain}/admin/oauth/access_token`, "TOKEN_URL");
async function getAdminToken(env2) {
  const cache = globalThis.__shopifyTokenCache ||= {};
  if (cache.token && Date.now() < cache.expires - 5 * 60 * 1e3) return cache.token;
  const resp = await fetch(TOKEN_URL(env2.SHOPIFY_SHOP_DOMAIN), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env2.SHOPIFY_CLIENT_ID,
      client_secret: env2.SHOPIFY_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });
  if (!resp.ok) {
    throw new Error(`shopify_auth_failed:${resp.status}`);
  }
  const data = await resp.json();
  if (!data.access_token) throw new Error("shopify_auth:no_token");
  cache.token = data.access_token;
  cache.expires = Date.now() + (data.expires_in ? data.expires_in * 1e3 : 12 * 3600 * 1e3);
  return cache.token;
}
__name(getAdminToken, "getAdminToken");
async function shopifyGraphQL(env2, query, variables = {}) {
  if (/^\s*mutation\b/i.test(String(query))) {
    const g = await guardAction(env2.DB, env2, "shopify_mutation");
    if (!g.ok) throw new Error(`shopify_mutation_blocked:${g.error === "kill_switch_blocked" ? "kill_switch_" + g.kill_switch : g.error}`);
  }
  const token = await getAdminToken(env2);
  const resp = await fetch(`https://${env2.SHOPIFY_SHOP_DOMAIN}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables })
  });
  if (!resp.ok) throw new Error(`shopify_graphql_http:${resp.status}`);
  const json = await resp.json();
  if (json.errors) throw new Error(`shopify_graphql_errors:${JSON.stringify(json.errors).slice(0, 200)}`);
  return json.data;
}
__name(shopifyGraphQL, "shopifyGraphQL");

// src/live/decision.js
function gateCheck(mappingStatus) {
  if (mappingStatus === "MANUAL_VERIFIED") return { allowed: true };
  return { allowed: false, reason: "NOT_MANUAL_VERIFIED" };
}
__name(gateCheck, "gateCheck");
var norm = /* @__PURE__ */ __name((x) => x == null || x === "" ? null : String(x).trim().toLowerCase(), "norm");
function variantIntegrity({
  our_sku,
  our_size,
  our_color,
  supplier_sku,
  mapped_variant_id,
  live_variant_id,
  live_variant_sku,
  live_variant_size,
  live_variant_color,
  variant_missing
}) {
  if (variant_missing) return "VARIANT_MISMATCH:variant_id";
  const mapId = norm(mapped_variant_id), liveId = norm(live_variant_id);
  if (mapId && liveId && mapId !== liveId) return "VARIANT_MISMATCH:variant_id";
  const os = norm(our_sku), ss = norm(supplier_sku), ls = norm(live_variant_sku);
  if (os && ls && os !== ls) return "VARIANT_MISMATCH:sku";
  if (os && ss && os !== ss) return "VARIANT_MISMATCH:sku";
  const osz = norm(our_size), lsz = norm(live_variant_size);
  if (osz && lsz && osz !== lsz) return "VARIANT_MISMATCH:size";
  const oc = norm(our_color), lc = norm(live_variant_color);
  if (oc && lc && oc !== lc) return "VARIANT_MISMATCH:color";
  return null;
}
__name(variantIntegrity, "variantIntegrity");
function evaluateLive(mapping, live, ctx) {
  const g = gateCheck(mapping.status);
  if (!g.allowed) return blocked(g.reason, { stage: "GATE" }, ctx);
  if (ctx.supplier_paused || ctx.supplier_status !== "ACTIVE")
    return blocked("SUPPLIER_UNAVAILABLE", snapshot(), ctx);
  if (!live || !live.ok)
    return blocked("LIVE_CHECK_FAILED:" + (live && live.reason || "no_data"), snapshot(), ctx);
  if (live.price == null || !Number.isFinite(live.price) || live.price <= 0)
    return blocked("LIVE_PRICE_MISSING", snapshot(), ctx);
  const mismatch = variantIntegrity({
    our_sku: mapping.our_sku,
    our_size: mapping.size,
    our_color: mapping.color,
    supplier_sku: mapping.supplier_sku,
    mapped_variant_id: mapping.supplier_variant_id,
    live_variant_id: live.variant_id,
    live_variant_sku: live.variant_sku,
    live_variant_size: live.variant_size,
    live_variant_color: live.variant_color,
    variant_missing: live.variant_missing
  });
  if (mismatch) return blocked(mismatch, snapshot(), ctx);
  if (live.stock_status === "UNAVAILABLE" || live.stock === 0 || live.availability === false)
    return blocked("STOCK_UNAVAILABLE", snapshot(), ctx);
  if (live.stock_status == null && live.stock == null) return blocked("STOCK_UNKNOWN", snapshot(), ctx);
  if (ctx.shipping == null || !Number.isFinite(ctx.shipping) || ctx.shipping < 0)
    return blocked("SHIPPING_COST_UNKNOWN", snapshot(), ctx);
  const baseline = mapping.approved_supplier_price;
  let price_changed = false, change_pct = null;
  if (baseline != null && Number.isFinite(baseline) && baseline > 0) {
    change_pct = (live.price - baseline) / baseline * 100;
    price_changed = Math.abs(change_pct) > (ctx.allowed_price_change_percent ?? 10);
  }
  const fees = ctx.fees || 0;
  const pe = evaluatePrice({
    supplier_cost: live.price,
    supplier_shipping: ctx.shipping,
    supplier_fees: fees,
    customer_price: mapping.store_price,
    quantity: 1
  }, ctx.settings || {});
  if (pe.status === "PRICE_BLOCKED")
    return blocked(
      "PROFIT_BLOCKED",
      snapshot(),
      ctx,
      { price_changed, change_pct, price_engine: pe }
    );
  if (pe.status === "PRICE_REVIEW")
    return blocked(
      "RISK_BLOCKED:price_review",
      snapshot(),
      ctx,
      { price_changed, change_pct, price_engine: pe }
    );
  if (ctx.reliability != null && ctx.min_reliability != null && ctx.reliability < ctx.min_reliability)
    return blocked(
      "RISK_BLOCKED:reliability_below_threshold",
      snapshot(),
      ctx,
      { price_changed, change_pct }
    );
  return {
    decision: "READY",
    live_status: "READY",
    supplier_ready: true,
    // ONLY this path may ever produce true
    price_changed,
    change_pct,
    landed_cost: round22(live.price + ctx.shipping + fees),
    profit: pe.breakdown,
    live: {
      price: live.price,
      currency: live.currency || "ILS",
      stock: live.stock,
      availability: live.availability,
      stock_status: live.stock_status || (live.availability ? "AVAILABLE" : "UNKNOWN"),
      checked_at: (/* @__PURE__ */ new Date()).toISOString(),
      source: live.source || null
    },
    price_engine: pe
  };
  function snapshot() {
    return {
      mapping_id: mapping.id || null,
      live: live ? {
        price: live.price ?? null,
        raw_price: live.raw_price ?? null,
        normalization_rule: live.normalization_rule || null,
        stock: live.stock ?? null,
        checked_at: (/* @__PURE__ */ new Date()).toISOString()
      } : null,
      ctx: { shipping: ctx.shipping ?? null, fees: ctx.fees ?? 0 }
    };
  }
  __name(snapshot, "snapshot");
}
__name(evaluateLive, "evaluateLive");
function blocked(reason, risk_snapshot, ctx, extra = {}) {
  return {
    decision: "BLOCKED",
    live_status: reason,
    supplier_ready: false,
    blocked_reason: reason,
    blocked_at: (/* @__PURE__ */ new Date()).toISOString(),
    risk_snapshot,
    ...extra
  };
}
__name(blocked, "blocked");
var round22 = /* @__PURE__ */ __name((x) => Math.round(x * 100) / 100, "round2");
function chunk(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}
__name(chunk, "chunk");
async function runLiveBatch(items, fn) {
  const results = [];
  for (const item of items) {
    try {
      results.push(await fn(item));
    } catch (e) {
      results.push({
        id: item.id ?? null,
        decision: "BLOCKED",
        blocked_reason: "LIVE_CHECK_FAILED:" + String(e && e.message || e).slice(0, 80),
        supplier_ready: false
      });
    }
  }
  return results;
}
__name(runLiveBatch, "runLiveBatch");

// src/live/fetch.js
var UA = "Mozilla/5.0 (compatible; sportpro-live-check/1.0)";
function normalizePrice(rawPrice, referencePrice) {
  if (rawPrice == null) return rawPrice;
  const ref2 = Number(referencePrice);
  if (!Number.isFinite(ref2) || ref2 <= 0) return rawPrice;
  if (rawPrice >= ref2 * 20 && rawPrice % 1 === 0) {
    const candidate = rawPrice / 100;
    if (candidate >= ref2 * 0.5 && candidate <= ref2 * 2) return candidate;
  }
  return rawPrice;
}
__name(normalizePrice, "normalizePrice");
function splitVariantTitle(t) {
  const s = String(t || "").trim();
  if (!s || s.toLowerCase() === "default title") return { size: null, color: null };
  const parts = s.split(/\s+\/\s+/).map((x) => x.trim()).filter(Boolean);
  return { size: parts[0] || null, color: parts[1] || null };
}
__name(splitVariantTitle, "splitVariantTitle");
function parseShopifyProduct(p, supplierVariantId) {
  const variants = Array.isArray(p && p.variants) ? p.variants : [];
  const v = variants.find((x) => String(x.id) === String(supplierVariantId));
  const out = {
    ok: true,
    source: "shopify:/products/handle.js",
    variant_missing: !v,
    price: null,
    currency: "ILS",
    stock: null,
    availability: false,
    variant_sku: null,
    variant_size: null,
    variant_color: null
  };
  if (!v) return out;
  const rawPrice = v.price;
  out.raw_price = rawPrice;
  out.normalization_rule = typeof rawPrice === "number" && Number.isInteger(rawPrice) ? "shopify_js_int_agorot:/100" : "shopify_js_decimal_string";
  if (rawPrice == null) out.price = null;
  else if (typeof rawPrice === "number" && Number.isInteger(rawPrice)) out.price = rawPrice / 100;
  else out.price = parseFloat(rawPrice);
  out.variant_sku = v.sku || null;
  const sc = splitVariantTitle(v.title);
  out.variant_size = sc.size;
  out.variant_color = sc.color;
  out.availability = !!v.available;
  out.stock = typeof v.inventory_quantity === "number" ? v.inventory_quantity : null;
  out.stock_status = v.available === true ? "AVAILABLE" : v.available === false ? "UNAVAILABLE" : "UNKNOWN";
  return out;
}
__name(parseShopifyProduct, "parseShopifyProduct");
function parseWooProduct(item, supplierVariantId) {
  const out = {
    ok: true,
    source: "woocommerce:store/v1",
    variant_missing: false,
    price: null,
    currency: "ILS",
    stock: null,
    availability: false,
    variant_sku: null,
    variant_size: null,
    variant_color: null
  };
  if (!item) return { ...out, ok: false, variant_missing: true };
  const pr = item.prices || {};
  const raw = pr.price;
  out.raw_price = raw;
  const mu = Number.isInteger(pr.currency_minor_unit) ? pr.currency_minor_unit : 2;
  out.normalization_rule = `woo_store_api_minor_unit_${mu}`;
  if (raw != null && raw !== "") out.price = parseFloat(raw) / 10 ** mu;
  if (item.prices && item.prices.currency_code) out.currency = item.prices.currency_code;
  out.availability = item.is_in_stock === true;
  out.stock = typeof item.low_stock_remaining === "number" ? item.low_stock_remaining : null;
  out.stock_status = item.is_in_stock === true ? "AVAILABLE" : "UNAVAILABLE";
  const vars = Array.isArray(item.variations) ? item.variations : [];
  if (supplierVariantId) {
    const v = vars.find((x) => String(x.id) === String(supplierVariantId));
    if (!v && vars.length) return { ...out, variant_missing: true };
  }
  return out;
}
__name(parseWooProduct, "parseWooProduct");
async function fetchLiveSupplier({ platform: platform2, url, supplierVariantId, timeoutMs = 15e3 }) {
  const u = new URL(url);
  const handle = u.pathname.split("/").filter(Boolean).pop();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    if (platform2 === "shopify") {
      const r = await fetch(
        `https://${u.hostname}/products/${handle}.js`,
        { headers: { "User-Agent": UA }, signal: ctrl.signal }
      );
      if (!r.ok) return { ok: false, reason: `HTTP_${r.status}` };
      const parsed = parseShopifyProduct(await r.json(), supplierVariantId);
      return parsed;
    }
    if (platform2 === "woocommerce") {
      const r = await fetch(
        `https://${u.hostname}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(handle)}`,
        { headers: { "User-Agent": UA }, signal: ctrl.signal }
      );
      if (!r.ok) return { ok: false, reason: `HTTP_${r.status}` };
      const arr = await r.json();
      return parseWooProduct(Array.isArray(arr) ? arr[0] : null, supplierVariantId);
    }
    return { ok: false, reason: "PLATFORM_UNSUPPORTED" };
  } catch (e) {
    return { ok: false, reason: String(e && e.name === "AbortError" ? "TIMEOUT" : e && e.message || e).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchLiveSupplier, "fetchLiveSupplier");

// src/mappings/validate.js
var MAPPING_LEVELS = {
  MANUAL_VERIFIED: "MANUAL_VERIFIED",
  // only this may procure
  CANDIDATE: "CANDIDATE",
  // discovered, exact evidence, NOT purchasable in pilot
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REJECTED: "REJECTED"
};
var norm2 = /* @__PURE__ */ __name((s) => String(s ?? "").trim().toLowerCase().replace(/[\s\u00a0]+/g, " ").replace(/["'"׳״]/g, ""), "norm");
function sizeMatches(a, b) {
  const na = String(a ?? "").match(/(\d+(?:\.\d+)?)/);
  const nb = String(b ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!na || !nb) return null;
  return na[1] === nb[1];
}
__name(sizeMatches, "sizeMatches");
function colorMatches(a, b) {
  if (!a || !b) return null;
  return norm2(a) === norm2(b);
}
__name(colorMatches, "colorMatches");
function titleSimilarity(a, b) {
  const A = norm2(a), B = norm2(b);
  if (!A || !B) return 0;
  const m = A.length, n = B.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}
__name(titleSimilarity, "titleSimilarity");
function validateMapping({ shopify, supplier }) {
  const reasons = [];
  let confidence = 0;
  if (!supplier || !supplier.supplier_variant_id) {
    return { level: "BLOCK", confidence: 0, reasons: ["supplier_variant:missing"] };
  }
  const sz = sizeMatches(shopify.size, supplier.size);
  if (sz === false) return { level: "BLOCK", confidence: 0, reasons: ["size:mismatch"] };
  if (sz === null) reasons.push("size:unknown");
  const col = colorMatches(shopify.color, supplier.color);
  if (col === false) return { level: "BLOCK", confidence: 0, reasons: ["color:mismatch"] };
  if (col === null) reasons.push("color:unknown");
  if (shopify.sku && supplier.sku) {
    if (norm2(shopify.sku) === norm2(supplier.sku)) {
      confidence += 0.6;
      reasons.push("sku:exact");
    } else {
      return { level: "BLOCK", confidence: 0, reasons: ["sku:mismatch"] };
    }
  } else {
    reasons.push("sku:missing");
  }
  if (shopify.barcode && supplier.barcode && norm2(shopify.barcode) === norm2(supplier.barcode)) {
    confidence += 0.2;
    reasons.push("barcode:exact");
  }
  const ts = titleSimilarity(shopify.title, supplier.title);
  if (ts >= 0.85) {
    confidence += 0.2 * ts;
    reasons.push(`title:${Math.round(ts * 100)}%`);
  } else if (ts >= 0.6) {
    confidence += 0.1 * ts;
    reasons.push(`title:${Math.round(ts * 100)}%`);
  } else reasons.push(`title:${Math.round(ts * 100)}%:weak`);
  if (sz === true) {
    confidence += 0.1;
    reasons.push("size:exact");
  }
  if (col === true) {
    confidence += 0.1;
    reasons.push("color:exact");
  }
  if (reasons.includes("sku:exact") && sz === true) {
    confidence = Math.max(confidence, 0.9);
    reasons.push("floor:sku_plus_variant");
  }
  const missingClarity = ["size"].filter((f) => !shopify[f] || !supplier[f]);
  if (!shopify.color || !supplier.color) reasons.push("color:unknown");
  if (missingClarity.length) reasons.push(`clarity:missing_${missingClarity.join("_")}`);
  if (!shopify.sku || !supplier.sku) {
    return {
      level: MAPPING_LEVELS.REVIEW_REQUIRED,
      confidence: Math.round(Math.min(0.85, confidence) * 100) / 100,
      reasons
    };
  }
  if (confidence >= 0.9 && missingClarity.length === 0) {
    return {
      level: MAPPING_LEVELS.CANDIDATE,
      confidence: Math.round(Math.min(1, confidence) * 100) / 100,
      reasons
    };
  }
  return {
    level: MAPPING_LEVELS.REVIEW_REQUIRED,
    confidence: Math.round(Math.min(0.89, confidence) * 100) / 100,
    reasons
  };
}
__name(validateMapping, "validateMapping");
function canProcureMapping(mapping, settings) {
  const minConf = settings?.verification?.mapping_confidence_min ?? 0.9;
  if (!mapping) return { allowed: false, reason: "mapping:missing" };
  if (mapping.status === MAPPING_LEVELS.CANDIDATE) {
    return { allowed: false, reason: "pilot:auto_not_purchasable" };
  }
  if (mapping.status !== MAPPING_LEVELS.MANUAL_VERIFIED) {
    return { allowed: false, reason: `mapping:${mapping.status || "unverified"}` };
  }
  if (!mapping.verified_at) return { allowed: false, reason: "mapping:not_verified" };
  if ((mapping.mapping_confidence ?? 0) < minConf) {
    return { allowed: false, reason: `mapping:low_confidence(${mapping.mapping_confidence})` };
  }
  return { allowed: true, reason: null };
}
__name(canProcureMapping, "canProcureMapping");
function verifyMappingVitals({
  supplier_price,
  supplier_stock,
  quantity,
  listed_supplier_price,
  checked_at
}, settings, now = Date.now()) {
  const v = settings?.verification || {};
  const price = verifyPrice({
    live_supplier_price: supplier_price,
    allowed_price_change_percent: v.allowed_price_change_percent ?? 3,
    live_checked_at: checked_at,
    price_check_max_age_hours: v.price_check_max_age_hours ?? 24,
    listed_supplier_price
  }, now);
  const stock = verifyStock({
    stock: supplier_stock,
    quantity,
    checked_at,
    stock_check_max_age_hours: v.stock_check_max_age_hours ?? 24
  }, now);
  return { price, stock, ok: price.status === "OK" && stock.status === "OK" };
}
__name(verifyMappingVitals, "verifyMappingVitals");
function computeSupplierReady({ mapping, vitals, supplier, settings }) {
  if (!mapping) return { supplier_ready: false, reasons: ["mapping:missing"] };
  const gate = canProcureMapping(mapping, settings);
  if (!gate.allowed) return { supplier_ready: false, reasons: [gate.reason] };
  if (!supplier || !supplier.active || supplier.paused) {
    return { supplier_ready: false, reasons: ["supplier:not_ready"] };
  }
  if (!vitals || !vitals.ok) {
    const reasons = [];
    if (vitals?.price?.status !== "OK") reasons.push(`price:${vitals?.price?.status || "unknown"}`);
    if (vitals?.stock?.status !== "OK") reasons.push(`stock:${vitals?.stock?.status || "unknown"}`);
    return { supplier_ready: false, reasons };
  }
  return { supplier_ready: true, reasons: [] };
}
__name(computeSupplierReady, "computeSupplierReady");

// src/mappings/api.js
function safeParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
__name(safeParse, "safeParse");
async function handleMappingApi(request, env2, url) {
  const path = url.pathname;
  const db = env2.DB;
  const settings = await getSettings(db);
  if (path === "/api/mappings" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT m.id, m.shopify_product_id, m.shopify_variant_id, m.size, m.color,
              m.supplier_sku, m.mapping_confidence, m.status AS mapping_status,
              m.verified_at, m.verified_by,
              s.code AS supplier_code, s.name AS supplier_name,
              sp.title AS supplier_product_title, sp.url AS supplier_product_url,
              sv.supplier_variant_id, sv.title AS supplier_variant_title,
              sv.sku AS supplier_variant_sku, sv.price AS supplier_price,
              sv.stock AS supplier_stock, sv.last_checked_at,
              p.title AS shopify_product_title
               FROM product_mappings m
       JOIN suppliers s ON s.id = m.supplier_id
       LEFT JOIN supplier_products sp ON sp.supplier_id = m.supplier_id AND sp.supplier_product_id = m.supplier_product_id
       LEFT JOIN supplier_variants sv ON sv.supplier_product_id = sp.id AND sv.supplier_variant_id = m.supplier_variant_id
       LEFT JOIN products p ON p.shopify_product_id = m.shopify_product_id
       ORDER BY m.id`
    ).all();
    const list = (rows.results || []).map((r) => {
      const vitals = r.supplier_price != null ? verifyMappingVitals(
        {
          supplier_price: r.supplier_price,
          supplier_stock: r.supplier_stock,
          quantity: 1,
          checked_at: r.last_checked_at
        },
        settings
      ) : null;
      const ready = computeSupplierReady({
        mapping: {
          status: r.mapping_status,
          mapping_confidence: r.mapping_confidence,
          verified_at: r.verified_at
        },
        supplier: { active: true, paused: false },
        vitals,
        settings
      });
      return {
        id: r.id,
        shopify: {
          product_id: r.shopify_product_id,
          variant_id: r.shopify_variant_id,
          product_title: r.shopify_product_title,
          size: r.size,
          color: r.color
        },
        supplier: {
          code: r.supplier_code,
          name: r.supplier_name,
          product_id: r.supplier_product_id,
          product_title: r.supplier_product_title,
          product_url: r.supplier_product_url,
          variant_id: r.supplier_variant_id,
          variant_title: r.supplier_variant_title,
          sku: r.supplier_variant_sku || r.supplier_sku
        },
        match: {
          price: r.supplier_price,
          stock: r.supplier_stock,
          last_checked: r.last_checked_at,
          confidence: r.mapping_confidence,
          status: r.mapping_status,
          verified_at: r.verified_at,
          verified_by: r.verified_by,
          vitals_ok: vitals ? vitals.ok : null
        },
        supplier_ready: ready.supplier_ready,
        supplier_ready_reasons: ready.reasons
      };
    });
    return Response.json(list);
  }
  if (path === "/api/catalog/import" && request.method === "POST") {
    const body = await request.json();
    const sup = await db.prepare("SELECT id FROM suppliers WHERE code = ?").bind(body.supplier_code).first();
    if (!sup) return Response.json({ error: "supplier_unknown" }, { status: 404 });
    const items = Array.isArray(body.products) ? body.products : [];
    let imported = 0, skipped = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const p of items) {
      if (!p.supplier_product_id || !(p.variants || []).length) {
        skipped++;
        continue;
      }
      await db.prepare(
        `INSERT INTO supplier_products (supplier_id, supplier_product_id, title, url, image_url, active, last_verified_at, platform)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), ?)
         ON CONFLICT (supplier_id, supplier_product_id) DO UPDATE SET
           title=excluded.title, url=excluded.url, image_url=excluded.image_url, platform=excluded.platform`
      ).bind(
        sup.id,
        String(p.supplier_product_id),
        p.title || null,
        p.product_url || null,
        p.image_url || null,
        body.platform || null
      ).run();
      const sp = await db.prepare(
        "SELECT id FROM supplier_products WHERE supplier_id = ? AND supplier_product_id = ?"
      ).bind(sup.id, String(p.supplier_product_id)).first();
      for (const v of p.variants.slice(0, 30)) {
        await db.prepare(
          `INSERT INTO supplier_variants (supplier_product_id, supplier_variant_id, sku, title, price, raw_price,
             normalization_rule, stock, size, color, shipping_cost, last_checked_at, barcode, brand, currency, last_seen_at, discovery_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'DISCOVERED')
           ON CONFLICT (supplier_product_id, supplier_variant_id) DO UPDATE SET
             sku=excluded.sku, title=excluded.title, price=excluded.price, raw_price=excluded.raw_price,
             normalization_rule=excluded.normalization_rule, stock=excluded.stock,
             size=excluded.size, color=excluded.color, barcode=excluded.barcode, brand=excluded.brand,
             currency=excluded.currency, last_seen_at=excluded.last_seen_at, discovery_status='DISCOVERED'`
        ).bind(
          sp.id,
          String(v.supplier_variant_id),
          v.sku || null,
          v.title || null,
          v.price ?? null,
          v.raw_price ?? null,
          v.normalization_rule || null,
          v.stock ?? null,
          v.size || null,
          v.color || null,
          now,
          v.barcode || null,
          v.brand || p.brand || null,
          v.currency || body.currency || "ILS",
          now
        ).run();
        imported++;
      }
    }
    return Response.json({
      ok: true,
      supplier: body.supplier_code,
      products_imported: items.length,
      variants_imported: imported,
      skipped
    });
  }
  if (path === "/api/mappings/import-batch" && request.method === "POST") {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const summary = {
      created: 0,
      duplicates_blocked: 0,
      validation_blocked: 0,
      levels: {
        MANUAL_VERIFIED: 0,
        CANDIDATE: 0,
        REVIEW_REQUIRED: 0
      },
      rejects: []
    };
    for (const it of items) {
      try {
        const res = await upsertMapping(db, it, settings);
        if (res.blocked) {
          if (res.reason === "duplicate") summary.duplicates_blocked++;
          else {
            summary.validation_blocked++;
            summary.rejects.push(res);
          }
        } else {
          summary.created++;
          summary.levels[res.level] = (summary.levels[res.level] || 0) + 1;
        }
      } catch (e) {
        summary.validation_blocked++;
        summary.rejects.push({ item: it.shopify_variant_id, reason: String(e.message || e).slice(0, 120) });
      }
    }
    return Response.json(summary);
  }
  if (path === "/api/mappings" && request.method === "POST") {
    const it = await request.json();
    const res = await upsertMapping(db, it, settings);
    return Response.json(res, { status: res.blocked ? 422 : 201 });
  }
  const m = path.match(/^\/api\/mappings\/(\d+)\/(approve|reject|edit)$/);
  if (m && request.method === "POST") {
    const id = m[1], action = m[2];
    const body = await request.json().catch(() => ({}));
    const row = await db.prepare("SELECT * FROM product_mappings WHERE id = ?").bind(id).first();
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    if (action === "approve") {
      if (!body.verified_by) return Response.json({ error: "verified_by_required" }, { status: 400 });
      const sup = await db.prepare(
        `SELECT sv.*, sp.supplier_product_id AS spid, sp.supplier_id AS sid FROM supplier_variants sv
         JOIN supplier_products sp ON sp.id = sv.supplier_product_id
         WHERE sp.supplier_id = ? AND sp.supplier_product_id = ? AND sv.supplier_variant_id = ?`
      ).bind(row.supplier_id, row.supplier_product_id, row.supplier_variant_id).first();
      const v = validateMapping({
        shopify: {
          title: row.shopify_title || body.shopify_title,
          size: row.size,
          color: row.color,
          sku: row.shopify_sku || row.supplier_sku,
          barcode: null
        },
        supplier: sup ? {
          title: sup.title,
          size: sup.size,
          color: sup.color,
          sku: sup.sku,
          barcode: null,
          supplier_variant_id: sup.supplier_variant_id
        } : null
      });
      if (v.level === "BLOCK") {
        return Response.json({ error: "cannot_approve_hard_block", reasons: v.reasons }, { status: 422 });
      }
      await db.prepare(
        `UPDATE product_mappings SET status = ?, verified_at = datetime('now'),
           verified_by = ? WHERE id = ?`
      ).bind(MAPPING_LEVELS.MANUAL_VERIFIED, body.verified_by, id).run();
      await audit(db, body.verified_by, "APPROVE_MAPPING", "product_mapping", id);
      return Response.json({ ok: true, id, status: MAPPING_LEVELS.MANUAL_VERIFIED });
    }
    if (action === "reject") {
      await db.prepare("UPDATE product_mappings SET status = ?, verified_at = NULL, verified_by = NULL WHERE id = ?").bind(MAPPING_LEVELS.REJECTED, id).run();
      await audit(db, body.verified_by || "admin", "REJECT_MAPPING", "product_mapping", id);
      return Response.json({ ok: true, id, status: MAPPING_LEVELS.REJECTED });
    }
    if (action === "edit") {
      const set = [], params = [];
      for (const f of ["size", "color", "supplier_sku", "supplier_product_id", "supplier_variant_id"]) {
        if (body[f] !== void 0) {
          set.push(`${f} = ?`);
          params.push(String(body[f]));
        }
      }
      if (!set.length) return Response.json({ error: "no_fields" }, { status: 400 });
      params.push(id);
      await db.prepare(`UPDATE product_mappings SET ${set.join(", ")} WHERE id = ?`).bind(...params).run();
      await db.prepare(
        `UPDATE product_mappings SET status = CASE WHEN status = 'MANUAL_VERIFIED' THEN 'REVIEW_REQUIRED' ELSE status END,
           verified_at = NULL, verified_by = NULL WHERE id = ?`
      ).bind(id).run();
      await audit(db, body.verified_by || "admin", "EDIT_MAPPING", "product_mapping", id);
      return Response.json({ ok: true, id, note: "verification reset \u2014 re-approve required" });
    }
  }
  if (path === "/api/pilot/summary" && request.method === "GET") {
    const byLevel = await db.prepare(
      `SELECT status, COUNT(*) AS n FROM product_mappings GROUP BY status`
    ).all();
    const products = await db.prepare(
      `SELECT COUNT(DISTINCT shopify_product_id) AS n FROM product_mappings`
    ).first();
    const variants = await db.prepare(
      `SELECT COUNT(DISTINCT shopify_variant_id) AS n FROM product_mappings`
    ).first();
    const suppliers = await db.prepare(
      `SELECT s.code, COUNT(m.id) AS mappings FROM product_mappings m
       JOIN suppliers s ON s.id = m.supplier_id GROUP BY s.code`
    ).all();
    const supProd = await db.prepare("SELECT COUNT(*) AS n FROM supplier_products").first();
    return Response.json({
      by_level: byLevel.results,
      products: products.n,
      variants: variants.n,
      suppliers: suppliers.results,
      supplier_products: supProd.n
    });
  }
  if (path === "/api/verify/candidates" && request.method === "GET") {
    const url2 = new URL(request.url);
    const status = url2.searchParams.get("status") || "CANDIDATE";
    const fSupplier = url2.searchParams.get("supplier");
    const fMinConf = parseFloat(url2.searchParams.get("min_confidence"));
    const fSku = url2.searchParams.get("sku");
    const fSize = url2.searchParams.get("size");
    const fColor = url2.searchParams.get("color");
    const fMinPrice = parseFloat(url2.searchParams.get("min_price"));
    const fMaxPrice = parseFloat(url2.searchParams.get("max_price"));
    let where = " WHERE m.status = ?";
    const binds = [status];
    if (fSupplier) {
      where += " AND s.code = ?";
      binds.push(fSupplier);
    }
    if (Number.isFinite(fMinConf)) {
      where += " AND m.mapping_confidence >= ?";
      binds.push(fMinConf);
    }
    if (fSku) {
      where += " AND (m.supplier_sku LIKE ? OR sv.sku LIKE ?)";
      binds.push("%" + fSku + "%", "%" + fSku + "%");
    }
    if (fSize) {
      where += " AND (m.size LIKE ? OR sv.size LIKE ?)";
      binds.push("%" + fSize + "%", "%" + fSize + "%");
    }
    if (fColor) {
      where += " AND (m.color LIKE ? OR sv.color LIKE ?)";
      binds.push("%" + fColor + "%", "%" + fColor + "%");
    }
    if (Number.isFinite(fMinPrice)) {
      where += " AND sv.price >= ?";
      binds.push(fMinPrice);
    }
    if (Number.isFinite(fMaxPrice)) {
      where += " AND sv.price <= ?";
      binds.push(fMaxPrice);
    }
    const rows = await db.prepare(
      `SELECT m.id, m.shopify_product_id, m.shopify_variant_id, m.supplier_sku, m.size, m.color,
              m.mapping_confidence, m.status AS mapping_status, m.verified_at, m.verified_by,
              m.verification_method, m.previous_status,
              m.live_status, m.live_price, m.live_stock, m.live_currency,
              m.live_checked_at, m.blocked_reason, m.blocked_at, m.landed_cost,
              m.profit_snapshot,
              p.title AS shopify_product_title, p.current_price AS shopify_price,
              p.shopify_image_url, p.supplier_ready,
              s.code AS supplier_code, s.name AS supplier_name,
              sp.title AS supplier_product_title, sp.url AS supplier_product_url,
              sp.image_url AS supplier_product_image,
              sv.supplier_variant_id, sv.title AS supplier_variant_title,
              sv.sku AS supplier_variant_sku, sv.size AS supplier_size, sv.color AS supplier_color,
              sv.price AS supplier_price, sv.stock AS supplier_stock,
              sv.currency, sv.last_seen_at, sv.last_checked_at
         FROM product_mappings m
         JOIN suppliers s ON s.id = m.supplier_id
         LEFT JOIN supplier_products sp ON sp.supplier_id = m.supplier_id AND sp.supplier_product_id = m.supplier_product_id
         LEFT JOIN supplier_variants sv ON sv.supplier_product_id = sp.id AND sv.supplier_variant_id = m.supplier_variant_id
         LEFT JOIN products p ON p.shopify_product_id = m.shopify_product_id` + where + ` ORDER BY m.mapping_confidence DESC, m.id ASC`
    ).bind(...binds).all();
    return Response.json(rows.results || []);
  }
  async function verifyTransition(id, toStatus, action, note) {
    const m2 = await db.prepare("SELECT * FROM product_mappings WHERE id = ?").bind(id).first();
    if (!m2) return { error: "mapping_not_found", code: 404 };
    if (m2.status !== "CANDIDATE") return { error: "not_a_candidate", code: 409 };
    if (toStatus === "MANUAL_VERIFIED") {
      if (!m2.supplier_sku || m2.mapping_confidence < 0.9) {
        return { error: "insufficient_evidence_sku_or_variant", code: 409 };
      }
      const ours = await db.prepare("SELECT sku FROM products WHERE shopify_product_id = ?").bind(m2.shopify_product_id).first();
      if (ours && ours.sku && ours.sku !== m2.supplier_sku) {
        return { error: "sku_mismatch", code: 409 };
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.prepare(
      `UPDATE product_mappings SET status = ?, previous_status = 'CANDIDATE',
         verified_at = ?, verified_by = 'owner', verification_method = 'MANUAL'
       WHERE id = ?`
    ).bind(toStatus, now, id).run();
    await db.prepare(
      "INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      "owner",
      action,
      "product_mapping",
      String(id),
      JSON.stringify({
        from_status: "CANDIDATE",
        to_status: toStatus,
        confidence: m2.mapping_confidence,
        note: note || null
      })
    ).run();
    return { ok: true, id, status: toStatus, supplier_ready: false };
  }
  __name(verifyTransition, "verifyTransition");
  if (path === "/api/verify/approve" && request.method === "POST") {
    const b = await request.json();
    if (!b.id) return Response.json({ error: "id_required" }, { status: 400 });
    const r = await verifyTransition(b.id, "MANUAL_VERIFIED", "VERIFY_APPROVE", b.reason);
    if (r.error) return Response.json(r, { status: r.code });
    return Response.json(r);
  }
  if (path === "/api/verify/reject" && request.method === "POST") {
    const b = await request.json();
    if (!b.id) return Response.json({ error: "id_required" }, { status: 400 });
    const r = await verifyTransition(b.id, "REJECTED", "VERIFY_REJECT", b.reason);
    if (r.error) return Response.json(r, { status: r.code });
    return Response.json(r);
  }
  if (path === "/api/verify/review" && request.method === "POST") {
    const b = await request.json();
    if (!b.id) return Response.json({ error: "id_required" }, { status: 400 });
    const r = await verifyTransition(b.id, "REVIEW_REQUIRED", "VERIFY_REVIEW_LATER", b.reason);
    if (r.error) return Response.json(r, { status: r.code });
    return Response.json(r);
  }
  if (path === "/api/verify/batch-approve" && request.method === "POST") {
    const b = await request.json();
    const ids = Array.isArray(b.ids) ? b.ids.map(Number) : [];
    if (ids.length < 2) return Response.json({ error: "ids_min_2" }, { status: 400 });
    const rows = await db.prepare(
      "SELECT * FROM product_mappings WHERE id IN (" + ids.join(",") + ")"
    ).all();
    const ms = rows.results || [];
    if (ms.length !== ids.length) return Response.json({ error: "some_not_found" }, { status: 404 });
    const first = ms[0];
    const same = ms.every((m2) => m2.status === "CANDIDATE" && m2.supplier_id === first.supplier_id && m2.supplier_variant_id === first.supplier_variant_id && m2.supplier_sku === first.supplier_sku && (m2.size || "") === (first.size || "") && (m2.color || "") === (first.color || ""));
    if (!same) return Response.json(
      {
        error: "batch_conditions_violated",
        requirement: "same supplier + exact SKU + exact variant + exact size + exact color"
      },
      { status: 409 }
    );
    let approved = 0;
    for (const id of ids) {
      const r = await verifyTransition(id, "MANUAL_VERIFIED", "VERIFY_APPROVE_BATCH", null);
      if (r.ok) approved++;
    }
    return Response.json({ ok: true, approved, supplier_ready: false });
  }
  if (path === "/api/verify/summary" && request.method === "GET") {
    const c = /* @__PURE__ */ __name(async (sql, ...args) => (await db.prepare(sql).bind(...args).first()).n, "c");
    const candidates = await c("SELECT COUNT(*) n FROM product_mappings WHERE status='CANDIDATE'");
    const approved = await c("SELECT COUNT(*) n FROM product_mappings WHERE status='MANUAL_VERIFIED'");
    const review = await c("SELECT COUNT(*) n FROM product_mappings WHERE status='REVIEW_REQUIRED' AND previous_status='CANDIDATE'");
    const rejected = await c("SELECT COUNT(*) n FROM product_mappings WHERE status='REJECTED' AND previous_status='CANDIDATE'");
    const manual = await c("SELECT COUNT(*) n FROM product_mappings WHERE status='MANUAL_VERIFIED'");
    const liveOk = await c("SELECT COUNT(*) n FROM product_mappings WHERE live_status='READY'");
    const blocked2 = await c("SELECT COUNT(*) n FROM product_mappings WHERE blocked_reason IS NOT NULL");
    const lc = /* @__PURE__ */ __name(async (sql) => (await db.prepare(sql).first()).n, "lc");
    const priceChanged = await lc("SELECT COUNT(*) n FROM product_mappings WHERE live_status='PRICE_CHANGED'");
    const stockFailed = await lc("SELECT COUNT(*) n FROM product_mappings WHERE live_status='STOCK_UNKNOWN' OR live_status='STOCK_LOST'");
    const profitFailed = await lc("SELECT COUNT(*) n FROM product_mappings WHERE live_status='PROFIT_BLOCKED'");
    const riskFailed = await lc("SELECT COUNT(*) n FROM product_mappings WHERE live_status LIKE 'RISK%'");
    const liveChecked = await lc("SELECT COUNT(*) n FROM product_mappings WHERE live_checked_at IS NOT NULL");
    const sr = await db.prepare(
      "SELECT COALESCE(SUM(supplier_ready),0) t, COUNT(*) n FROM products"
    ).first();
    return Response.json({
      candidates,
      approved,
      review,
      rejected,
      remaining: candidates,
      manual_verified: manual,
      live_verified: liveOk,
      live_checked: liveChecked,
      price_changed: priceChanged,
      stock_failed: stockFailed,
      profit_failed: profitFailed,
      risk_failed: riskFailed,
      blocked: blocked2,
      supplier_ready_true: sr.t,
      supplier_ready_false: sr.n - sr.t,
      note: "MANUAL_VERIFIED != supplier_ready. supplier_ready=true only after live price/stock checks + profit/risk engines."
    });
  }
  async function loadLiveContext(id) {
    const m2 = await db.prepare(
      `SELECT m.*, s.code AS supplier_code, s.platform AS supplier_platform,
              s.status AS supplier_status, s.paused AS supplier_paused,
              s.reliability_score, sp.url AS supplier_url,
              p.title AS shopify_product_title, p.current_price AS store_price, p.sku AS our_sku,
              (SELECT sv.price FROM supplier_variants sv
                WHERE sv.supplier_product_id = sp.id
                  AND sv.supplier_variant_id = m.supplier_variant_id
                LIMIT 1) AS discovery_price
         FROM product_mappings m
         JOIN suppliers s ON s.id = m.supplier_id
         LEFT JOIN supplier_products sp ON sp.supplier_id = m.supplier_id AND sp.supplier_product_id = m.supplier_product_id
         LEFT JOIN products p ON p.shopify_product_id = m.shopify_product_id
        WHERE m.id = ?`
    ).bind(id).first();
    return m2 || null;
  }
  __name(loadLiveContext, "loadLiveContext");
  async function verifyLiveMapping(id) {
    const m2 = await loadLiveContext(id);
    if (!m2) return { code: 404, error: "mapping_not_found" };
    const g = gateCheck(m2.status);
    if (!g.allowed) return {
      code: 409,
      error: "not_manual_verified",
      reason: g.reason,
      note: "Live verification runs only for MANUAL_VERIFIED"
    };
    const settings2 = await getSettings(db);
    const shipRow = await db.prepare(
      `SELECT shipping_cost, currency, shipping_method, verified_at, verified_by, source
         FROM supplier_shipping WHERE supplier_id = ? AND verified_at IS NOT NULL
         ORDER BY verified_at DESC LIMIT 1`
    ).bind(m2.supplier_id).first();
    const shipping = shipRow ? shipRow.shipping_cost : null;
    const fees = 0;
    const live = await fetchLiveSupplier({
      platform: m2.supplier_platform,
      url: m2.supplier_url,
      supplierVariantId: m2.supplier_variant_id
    });
    if (live && live.price != null)
      live.price = normalizePrice(live.price, m2.discovery_price);
    const result = evaluateLive(
      {
        id: m2.id,
        status: m2.status,
        supplier_sku: m2.supplier_sku,
        size: m2.size,
        color: m2.color,
        supplier_variant_id: m2.supplier_variant_id,
        store_price: m2.store_price,
        our_sku: m2.our_sku,
        approved_supplier_price: m2.approved_supplier_price
      },
      live,
      {
        shipping,
        fees,
        settings: settings2,
        supplier_status: m2.supplier_status,
        supplier_paused: m2.supplier_paused,
        reliability: m2.reliability_score,
        min_reliability: settings2.min_reliability ?? 0.5,
        allowed_price_change_percent: (settings2.live_checks && settings2.live_checks.allowed_price_change_percent) ?? 10
      }
    );
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.prepare(
      `UPDATE product_mappings SET live_status=?, live_price=?, live_currency=?,
         live_stock=?, live_checked_at=?, live_source=?, landed_cost=?,
         profit_snapshot=?, risk_snapshot=?, blocked_reason=?, blocked_at=?,
         approved_supplier_price=COALESCE(approved_supplier_price, ?)
       WHERE id=?`
    ).bind(
      result.live_status,
      live.ok && live.price != null ? live.price : null,
      live.currency || null,
      live.ok && live.stock != null ? live.stock : null,
      now,
      live.source || null,
      result.landed_cost ?? null,
      result.profit ? JSON.stringify(result.profit) : null,
      result.risk_snapshot ? JSON.stringify(result.risk_snapshot) : null,
      result.blocked_reason || null,
      result.blocked_at || null,
      live.ok && live.price != null ? live.price : null,
      id
    ).run();
    if (result.price_changed) {
      await db.prepare(
        `INSERT INTO price_history (supplier_id, supplier_variant_id, price, raw_price, stock, shipping, checked_at)
           VALUES (?,?,?,?,?,?,?)`
      ).bind(
        m2.supplier_id,
        m2.supplier_variant_id,
        live.price,
        live.raw_price ?? null,
        live.stock ?? null,
        shipping ?? null,
        now
      ).run();
    }
    await db.prepare(
      `UPDATE products SET supplier_ready=?, status=?, blocked_reason=? WHERE shopify_product_id=?`
    ).bind(
      result.decision === "READY" ? 1 : 0,
      result.decision === "READY" ? "ACTIVE" : "SUPPLIER_NOT_READY",
      result.decision === "READY" ? null : result.blocked_reason || "LIVE_CHECK_FAILED",
      m2.shopify_product_id
    ).run();
    await db.prepare(
      "INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)"
    ).bind(
      "owner",
      "LIVE_VERIFY",
      "product_mapping",
      String(id),
      JSON.stringify({
        decision: result.decision,
        blocked_reason: result.blocked_reason || null,
        live_price: live.price ?? null,
        raw_live_price: live.raw_price ?? null,
        normalization_rule: live.normalization_rule || null,
        live_stock: live.stock ?? null
      })
    ).run();
    return {
      ok: true,
      id,
      decision: result.decision,
      supplier_ready: result.decision === "READY",
      blocked_reason: result.blocked_reason || null,
      price_changed: !!result.price_changed,
      result
    };
  }
  __name(verifyLiveMapping, "verifyLiveMapping");
  const pm = path.match(/^\/api\/mappings\/(\d+)\/verify-live$/);
  if (pm && request.method === "POST") {
    const r = await verifyLiveMapping(Number(pm[1]));
    if (r.error) return Response.json(r, { status: r.code });
    return Response.json(r);
  }
  if (path === "/api/mappings/verify-live-batch" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    let ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : null;
    if (!ids) {
      const rows = await db.prepare(
        `SELECT id FROM product_mappings WHERE status='MANUAL_VERIFIED'`
      ).all();
      ids = (rows.results || []).map((r) => r.id);
    }
    const withRetry = /* @__PURE__ */ __name(async (id) => {
      let r = await verifyLiveMapping(id);
      if (r.error && r.retryable !== false) {
        await new Promise((res) => setTimeout(res, 1500));
        r = await verifyLiveMapping(id);
      }
      return r;
    }, "withRetry");
    const results = [];
    for (const part of chunk(ids, 5)) {
      const r = await runLiveBatch(part, withRetry);
      results.push(...r);
    }
    const ready = results.filter((x) => x.decision === "READY").length;
    return Response.json({
      ok: true,
      checked: results.length,
      ready,
      blocked: results.length - ready,
      results
    });
  }
  if (path === "/api/mappings/recheck-ready" && request.method === "POST") {
    const rows = await db.prepare(
      `SELECT m.id FROM product_mappings m JOIN products p
         ON p.shopify_product_id = m.shopify_product_id
        WHERE p.supplier_ready = 1`
    ).all();
    const ids = (rows.results || []).map((r) => r.id);
    const results = [];
    for (const part of chunk(ids, 5)) {
      const r = await runLiveBatch(part, (id) => verifyLiveMapping(id));
      results.push(...r);
    }
    const ready = results.filter((x) => x.decision === "READY").length;
    return Response.json({
      ok: true,
      rechecked: results.length,
      ready,
      blocked: results.length - ready,
      results
    });
  }
  if (path === "/api/settings/shipping" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT s.code AS supplier_code, sh.shipping_method, sh.shipping_cost, sh.currency,
              sh.effective_from, sh.verified_at, sh.verified_by, sh.source
         FROM supplier_shipping sh JOIN suppliers s ON s.id = sh.supplier_id
        ORDER BY sh.supplier_id`
    ).all();
    return Response.json({
      supplier_shipping: rows.results || [],
      note: "Only rows with verified_at are honored in READY checks; absent/unverified = SHIPPING_COST_UNKNOWN = BLOCK"
    });
  }
  const EDITABLE_KEYS = ["price_policy", "pricing_rules", "price_ceiling", "profit_guard", "fees", "pricing_rounding", "supplier_selection"];
  if (path === "/api/settings" && request.method === "GET") {
    const rows = await db.prepare("SELECT key, value, updated_at FROM system_settings").all();
    const out = {};
    for (const r of rows.results || []) out[r.key] = { value: safeParse(r.value), updated_at: r.updated_at };
    return Response.json({ settings: out });
  }
  if (path.startsWith("/api/settings/") && request.method === "PUT") {
    const key = path.slice("/api/settings/".length);
    if (!EDITABLE_KEYS.includes(key)) {
      return Response.json({ error: "setting_not_editable", key, editable: EDITABLE_KEYS }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const value = body && body.value !== void 0 ? body.value : body;
    if (value === void 0 || value === null) return Response.json({ error: "invalid_value" }, { status: 400 });
    const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    await db.prepare(
      "INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    ).bind(key, serialized).run();
    await audit(db, "owner", "SETTING_UPDATED", "system_settings", key, { key });
    return Response.json({ ok: true, key, value: safeParse(serialized) });
  }
  if (path === "/api/settings/shipping" && request.method === "POST") {
    const body = await request.json();
    if (!body.supplier_code) return Response.json({ error: "supplier_code_required" }, { status: 400 });
    const sup = await db.prepare("SELECT id FROM suppliers WHERE code = ?").bind(body.supplier_code).first();
    if (!sup) return Response.json({ error: "supplier_unknown" }, { status: 404 });
    if (body.shipping_cost === null) {
      await db.prepare("DELETE FROM supplier_shipping WHERE supplier_id = ?").bind(sup.id).run();
      return Response.json({ ok: true, removed: true });
    }
    const cost = Number(body.shipping_cost);
    if (!Number.isFinite(cost) || cost < 0)
      return Response.json({ error: "invalid_shipping_cost" }, { status: 400 });
    await db.prepare("DELETE FROM supplier_shipping WHERE supplier_id = ?").bind(sup.id).run();
    await db.prepare(
      `INSERT INTO supplier_shipping (supplier_id, shipping_method, shipping_cost, currency, effective_from, verified_at, verified_by, source)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 'owner', ?)`
    ).bind(
      sup.id,
      body.shipping_method || null,
      cost,
      body.currency || "ILS",
      body.effective_from || (/* @__PURE__ */ new Date()).toISOString(),
      body.source || "manual"
    ).run();
    await db.prepare(
      "INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)"
    ).bind(
      "owner",
      "SHIPPING_CONFIGURED",
      "supplier_shipping",
      String(sup.id),
      JSON.stringify({
        supplier_code: body.supplier_code,
        shipping_cost: cost,
        currency: body.currency || "ILS",
        method: body.shipping_method || null,
        source: body.source || "manual"
      })
    ).run();
    return Response.json({
      ok: true,
      supplier_code: body.supplier_code,
      shipping_cost: cost,
      verified_by: "owner"
    });
  }
  return Response.json({ error: `mapping_route_not_implemented:${path}` }, { status: 501 });
}
__name(handleMappingApi, "handleMappingApi");
async function upsertMapping(db, it, settings) {
  const supId = await db.prepare("SELECT id FROM suppliers WHERE code = ?").bind(it.supplier_code).first();
  if (!supId) return { blocked: true, reason: "supplier_unknown" };
  const existing = await db.prepare(
    `SELECT id FROM product_mappings WHERE shopify_variant_id = ? AND supplier_id = ? AND supplier_variant_id = ?`
  ).bind(String(it.shopify.variant_id), supId.id, String(it.supplier.supplier_variant_id)).all();
  if ((existing.results || []).length) return { blocked: true, reason: "duplicate" };
  const v = validateMapping({ shopify: it.shopify, supplier: it.supplier });
  if (v.level === "BLOCK") return { blocked: true, reason: "validation", detail: v.reasons };
  await db.prepare(
    `INSERT INTO supplier_products (supplier_id, supplier_product_id, title, url, image_url, active, last_verified_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
     ON CONFLICT (supplier_id, supplier_product_id) DO UPDATE SET
       title = excluded.title, url = excluded.url, image_url = excluded.image_url`
  ).bind(
    supId.id,
    String(it.supplier.product_id),
    it.supplier.product_title || null,
    it.supplier.product_url || null,
    it.supplier.image_url || null
  ).run();
  const spRow = await db.prepare(
    "SELECT id FROM supplier_products WHERE supplier_id = ? AND supplier_product_id = ?"
  ).bind(supId.id, String(it.supplier.product_id)).first();
  await db.prepare(
    `INSERT INTO supplier_variants (supplier_product_id, supplier_variant_id, sku, title, price, stock, size, color, shipping_cost, last_checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (supplier_product_id, supplier_variant_id) DO UPDATE SET
       sku = excluded.sku, title = excluded.title, price = excluded.price,
       stock = excluded.stock, size = excluded.size, color = excluded.color,
       last_checked_at = excluded.last_checked_at`
  ).bind(
    spRow.id,
    String(it.supplier.supplier_variant_id),
    it.supplier.sku || null,
    it.supplier.title || null,
    it.supplier.price ?? null,
    it.supplier.stock ?? null,
    it.supplier.size || null,
    it.supplier.color || null,
    it.supplier.shipping || 0,
    it.supplier.checked_at || (/* @__PURE__ */ new Date()).toISOString()
  ).run();
  const exProd = await db.prepare("SELECT id FROM products WHERE shopify_product_id = ?").bind(String(it.shopify.product_id)).first();
  if (exProd) {
    await db.prepare("UPDATE products SET title = ?, shopify_variant_id = ? WHERE id = ?").bind(it.shopify.title || null, String(it.shopify.variant_id), exProd.id).run();
  } else {
    await db.prepare(
      `INSERT INTO products (shopify_product_id, shopify_variant_id, title, status)
       VALUES (?, ?, ?, 'MAPPING_REQUIRED')`
    ).bind(
      String(it.shopify.product_id),
      String(it.shopify.variant_id),
      it.shopify.title || null
    ).run();
  }
  await db.prepare(
    `INSERT INTO product_mappings (shopify_product_id, shopify_variant_id, supplier_id,
       supplier_product_id, supplier_variant_id, supplier_sku, size, color,
       mapping_confidence, status, verified_at, verified_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
  ).bind(
    String(it.shopify.product_id),
    String(it.shopify.variant_id),
    supId.id,
    String(it.supplier.product_id),
    String(it.supplier.supplier_variant_id),
    it.supplier.sku || null,
    it.shopify.size || null,
    it.shopify.color || null,
    v.confidence,
    v.level
  ).run();
  return { blocked: false, level: v.level, confidence: v.confidence, reasons: v.reasons };
}
__name(upsertMapping, "upsertMapping");
async function audit(db, actor, action, entityType, entityId) {
  await db.prepare("INSERT INTO audit_log (actor, action, entity_type, entity_id) VALUES (?, ?, ?, ?)").bind(actor || "admin", action, entityType, String(entityId)).run();
}
__name(audit, "audit");

// src/checkout/adapters.js
var CHECKOUT_TTL_MINUTES = 30;
function expiresIn() {
  return new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1e3).toISOString();
}
__name(expiresIn, "expiresIn");
var TEST_CUSTOMER = {
  first_name: "Test",
  last_name: "Customer",
  email: "test@sportpro.shop",
  phone: "0500000000",
  address1: "Test Street 1",
  city: "Tel Aviv",
  zip: "0000000",
  country: "IL"
};
function baseDraft(supplier, item, totals, overrides = {}) {
  return Object.assign({
    checkout_status: "DRAFT_READY",
    checkout_url: null,
    supplier: { code: supplier.code, name: supplier.name, platform: supplier.platform },
    product: item.title || null,
    variant: item.supplier_variant_id || null,
    quantity: item.quantity,
    price: totals.price,
    // unit supplier price
    shipping: totals.shipping,
    total: totals.total,
    // price*qty + shipping
    expires_at: expiresIn(),
    error: null
  }, overrides);
}
__name(baseDraft, "baseDraft");
function shopifyAdapter(supplier, item, totals, opts = {}) {
  try {
    const base = (supplier.base_url || "").replace(/\/+$/, "");
    if (!base) throw new Error("supplier_missing_base_url");
    const variantId = item.supplier_variant_id;
    if (!variantId) throw new Error("supplier_variant_missing");
    const c = opts.is_test ? TEST_CUSTOMER : opts.customer || {};
    const params = new URLSearchParams();
    if (c.email) params.set("checkout[email]", c.email);
    if (c.first_name) params.set("checkout[shipping_address][first_name]", c.first_name);
    if (c.last_name) params.set("checkout[shipping_address][last_name]", c.last_name);
    if (c.address1) params.set("checkout[shipping_address][address1]", c.address1);
    if (c.city) params.set("checkout[shipping_address][city]", c.city);
    if (c.zip) params.set("checkout[shipping_address][zip]", c.zip);
    if (c.country) params.set("checkout[shipping_address][country]", c.country);
    const url = `${base}/cart/${variantId}:${item.quantity}?${params.toString()}`;
    return baseDraft(supplier, item, totals, { checkout_url: url, adapter: "shopify_cart_permalink" });
  } catch (e) {
    return baseDraft(
      supplier,
      item,
      totals,
      { checkout_status: "DRAFT_FAILED", adapter: "shopify_cart_permalink", error: String(e.message || e) }
    );
  }
}
__name(shopifyAdapter, "shopifyAdapter");
function wooAdapter(supplier, item, totals, opts = {}) {
  try {
    const base = (supplier.base_url || "").replace(/\/+$/, "");
    if (!base) throw new Error("supplier_missing_base_url");
    const productId = item.supplier_product_id;
    if (!productId) throw new Error("supplier_product_missing");
    const c = opts.is_test ? TEST_CUSTOMER : opts.customer || {};
    const params = new URLSearchParams();
    params.set("add-to-cart", String(productId));
    if (item.supplier_variant_id) params.set("variation_id", String(item.supplier_variant_id));
    if (c.email) params.set("billing_email", c.email);
    const url = `${base}/?${params.toString()}`;
    return baseDraft(
      supplier,
      item,
      totals,
      { checkout_url: url, adapter: "woocommerce_add_to_cart" }
    );
  } catch (e) {
    return baseDraft(
      supplier,
      item,
      totals,
      { checkout_status: "DRAFT_FAILED", adapter: "woocommerce_add_to_cart", error: String(e.message || e) }
    );
  }
}
__name(wooAdapter, "wooAdapter");
function manualAdapter(supplier, item, totals, opts = {}) {
  const base = (supplier.base_url || "").replace(/\/+$/, "");
  return baseDraft(supplier, item, totals, {
    checkout_status: "DRAFT_READY_MANUAL",
    checkout_url: base || null,
    adapter: "manual",
    note: "Manual checkout: open supplier site, add variant, confirm totals, pay with Google Pay.",
    is_test: !!opts.is_test
  });
}
__name(manualAdapter, "manualAdapter");
var PLATFORM_ADAPTERS = {
  shopify: shopifyAdapter,
  woocommerce: wooAdapter,
  wix: manualAdapter,
  custom: manualAdapter
};
function SupplierCheckoutAdapter(supplier, item, totals, opts = {}) {
  if (supplier.checkout_method === "manual") return manualAdapter(supplier, item, totals, opts);
  const fn = PLATFORM_ADAPTERS[(supplier.platform || "").toLowerCase()];
  if (!fn) return manualAdapter(supplier, item, totals, opts);
  return fn(supplier, item, totals, opts);
}
__name(SupplierCheckoutAdapter, "SupplierCheckoutAdapter");

// src/core/alerts.js
var ALERT_EVENTS = [
  "NEW_ORDER",
  "APPROVAL_REQUIRED",
  "PRICE_CHANGED",
  "STOCK_LOST",
  "SUPPLIER_DOWN",
  "PURCHASE_FAILED",
  "TRACKING_RECEIVED",
  "REFUND_REQUIRED"
];
var SEVERITY = {
  NEW_ORDER: "info",
  APPROVAL_REQUIRED: "info",
  PRICE_CHANGED: "warning",
  STOCK_LOST: "warning",
  SUPPLIER_DOWN: "critical",
  PURCHASE_FAILED: "critical",
  TRACKING_RECEIVED: "info",
  REFUND_REQUIRED: "critical"
};
function sanitizeDetails(details) {
  if (!details || typeof details !== "object") return null;
  const banned = [
    "email",
    "phone",
    "customer_email",
    "customer_phone",
    "address",
    "shipping_address",
    "customer_name",
    "first_name",
    "last_name",
    "name"
  ];
  const clean = {};
  for (const [k, v] of Object.entries(details)) {
    if (!banned.includes(String(k).toLowerCase())) clean[k] = v;
  }
  return JSON.stringify(clean);
}
__name(sanitizeDetails, "sanitizeDetails");
async function recordAlert(db, { event_type, entity_type, entity_id, title: title2, details }) {
  if (!ALERT_EVENTS.includes(event_type)) {
    throw new Error(`unknown_alert_event:${event_type}`);
  }
  await db.prepare(
    `INSERT INTO alerts (event_type, severity, entity_type, entity_id, title, details, channel)
     VALUES (?, ?, ?, ?, ?, ?, 'dashboard')`
  ).bind(
    event_type,
    SEVERITY[event_type],
    entity_type || null,
    entity_id != null ? String(entity_id) : null,
    title2,
    sanitizeDetails(details)
  ).run();
  return { ok: true, event_type, severity: SEVERITY[event_type] };
}
__name(recordAlert, "recordAlert");
async function listAlerts(db, { unread_only, limit }) {
  const lim = Math.min(Number(limit) || 100, 500);
  const rows = await db.prepare(
    `SELECT * FROM alerts ${unread_only ? "WHERE read = 0" : ""}
     ORDER BY id DESC LIMIT ${lim}`
  ).all();
  return rows.results || [];
}
__name(listAlerts, "listAlerts");

// src/pricing/recalc.js
async function computeCatalogRecalc(db, { persist = false } = {}) {
  const settings = await getSettings(db);
  const shippingRows = await db.prepare(
    `SELECT supplier_id, shipping_cost FROM supplier_shipping WHERE verified_at IS NOT NULL`
  ).all();
  const shippingBySupplier = {};
  for (const r of shippingRows.results || []) shippingBySupplier[r.supplier_id] = r.shipping_cost;
  const rows = await db.prepare(
    `SELECT m.id AS mapping_id, m.supplier_id, m.status AS mapping_status, m.mapping_confidence,
            m.shopify_product_id, m.live_status, m.live_price, m.live_stock, m.blocked_reason,
            p.id AS product_row, p.current_price, p.supplier_ready,
            sv.price AS supplier_price, sv.stock AS discovery_stock,
            sp.url AS supplier_url, sp.id AS sp_internal_id,
            s.code AS supplier_code, s.status AS supplier_status, s.paused AS supplier_paused
       FROM product_mappings m
       JOIN suppliers s ON s.id = m.supplier_id
       LEFT JOIN supplier_products sp ON sp.supplier_id = m.supplier_id AND sp.supplier_product_id = m.supplier_product_id
       LEFT JOIN supplier_variants sv ON sv.supplier_product_id = sp.id AND sv.supplier_variant_id = m.supplier_variant_id
       LEFT JOIN products p ON p.shopify_product_id = m.shopify_product_id`
  ).all();
  let wouldUpdate = 0, wouldBlock = 0, wouldChangePrice = 0, wouldDisable = 0;
  const margins = [], nets = [];
  const failures = {
    no_mapping_verified: 0,
    no_live_price: 0,
    no_live_stock: 0,
    unknown_shipping: 0,
    profit_fail: 0,
    supplier_inactive: 0
  };
  const eligibilityUpdates = [];
  for (const r of rows.results || []) {
    const cost = r.supplier_price != null ? r.supplier_price : r.live_price != null ? r.live_price : null;
    const shipping = shippingBySupplier[r.supplier_id];
    const reasons = [];
    if (r.supplier_status !== "ACTIVE" || r.supplier_paused) {
      reasons.push("SUPPLIER_INACTIVE");
      failures.supplier_inactive++;
    }
    if (r.mapping_status !== "MANUAL_VERIFIED") {
      reasons.push("MAPPING_NOT_VERIFIED");
      failures.no_mapping_verified++;
    }
    if (r.live_status == null || r.live_price == null) {
      reasons.push("LIVE_PRICE_MISSING");
      failures.no_live_price++;
    }
    if (r.live_status == null || r.live_stock == null && r.live_status !== "READY") {
      reasons.push("LIVE_STOCK_MISSING");
      failures.no_live_stock++;
    }
    if (shipping == null) {
      reasons.push("SHIPPING_COST_UNKNOWN");
      failures.unknown_shipping++;
    }
    if (cost != null && cost > 0 && reasons.length === 0) {
      const sim = simulatePricing({
        supplier_cost: cost,
        supplier_shipping: shipping,
        current_price: r.current_price || null,
        settings
      });
      if (sim.status === "PRICE_BLOCKED" || sim.status === "PRICE_REVIEW") {
        reasons.push("PROFIT:" + (sim.reasons || []).join(","));
        failures.profit_fail++;
      } else {
        const b = sim.current && sim.current.net_profit != null ? sim.current : sim.recommended || {};
        nets.push(b.net_profit || 0);
        margins.push(b.net_margin || 0);
        wouldUpdate++;
        if (r.current_price && sim.recommended_price && Math.abs(sim.recommended_price - r.current_price) > 0.01) {
          wouldChangePrice++;
        }
      }
    } else if (reasons.length === 0) {
      reasons.push("SUPPLIER_COST_MISSING");
    }
    if (reasons.length > 0) {
      wouldBlock++;
      wouldDisable++;
    }
    eligibilityUpdates.push({
      product: r.shopify_product_id,
      status: reasons.length === 0 ? "SELLABLE" : "NOT_SELLABLE",
      reason: reasons.length === 0 ? null : reasons.join("|")
    });
  }
  if (persist) {
    for (const u of eligibilityUpdates) {
      await db.prepare(
        `UPDATE products SET eligibility_status = ?, eligibility_blocked_reason = ?,
           eligibility_updated_at = datetime('now') WHERE shopify_product_id = ?`
      ).bind(u.status, u.reason, u.product).run();
    }
  }
  const avg = /* @__PURE__ */ __name((a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, "avg");
  return {
    dry_run: true,
    report: {
      total_mappings: rows.results.length,
      would_update: wouldUpdate,
      would_block: wouldBlock,
      would_change_price: wouldChangePrice,
      would_disable: wouldDisable,
      average_net_margin: avg(margins),
      average_net_profit: avg(nets),
      failure_breakdown: failures
    },
    persisted_eligibility: persist ? eligibilityUpdates.length : 0
  };
}
__name(computeCatalogRecalc, "computeCatalogRecalc");

// src/orders/api.js
async function audit2(db, actor, action, entityType, entityId, details) {
  await db.prepare(
    `INSERT INTO audit_log (actor, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    actor || "owner",
    action,
    entityType,
    entityId != null ? String(entityId) : null,
    details ? JSON.stringify(details) : null
  ).run();
}
__name(audit2, "audit");
async function killSwitchActive(db) {
  let row = null;
  try {
    row = await db.prepare(
      `SELECT value FROM system_settings WHERE key = 'kill_switch'`
    ).first();
  } catch {
    return true;
  }
  return parseKillSwitch(row ? row.value : null).state !== "OFF";
}
__name(killSwitchActive, "killSwitchActive");
async function setOrderStatus(db, order, toCanonical, reason) {
  const to = canonicalStatus(toCanonical);
  const from = canonicalStatus(order.status);
  if (!canTransition(from, to)) {
    return { error: `illegal_status_transition:${from}->${to}`, code: 409 };
  }
  await db.prepare(
    `UPDATE orders SET status = ?, blocked_reason = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(to, reason || null, order.id).run();
  return { ok: true, from, to };
}
__name(setOrderStatus, "setOrderStatus");
async function handleOrdersApi(request, env2, url) {
  const db = env2.DB;
  const path = url.pathname;
  const settings = await getSettings(db);
  if (path === "/api/procurement/queue" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT so.id, so.order_id, so.supplier_id, so.status, so.is_test,
              so.supplier_subtotal, so.supplier_shipping, so.supplier_total,
              so.customer_revenue, so.expected_net_profit, so.expected_net_margin,
              o.order_number, o.customer_name, o.status AS order_status, o.is_test AS order_is_test,
              s.code AS supplier_code, s.name AS supplier_name,
              so.items
         FROM supplier_orders so
         JOIN orders o ON o.id = so.order_id
         JOIN suppliers s ON s.id = so.supplier_id
        WHERE so.status IN ('PENDING','READY_FOR_APPROVAL_1')
        ORDER BY so.id DESC LIMIT 200`
    ).all();
    return Response.json(rows.results || []);
  }
  const sod = path.match(/^\/api\/supplier-orders\/(\d+)$/);
  if (sod && request.method === "GET") {
    const id = Number(sod[1]);
    const so = await db.prepare(
      `SELECT so.*, o.order_number, o.is_test AS order_is_test, o.status AS order_status,
              s.code AS supplier_code, s.name AS supplier_name, s.platform, s.base_url, s.checkout_method
         FROM supplier_orders so
         JOIN orders o ON o.id = so.order_id
         JOIN suppliers s ON s.id = so.supplier_id
        WHERE so.id = ?`
    ).bind(id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const purchase = await db.prepare(
      "SELECT * FROM supplier_purchases WHERE supplier_order_id = ?"
    ).bind(id).first();
    const track = await db.prepare(
      "SELECT * FROM tracking WHERE supplier_order_id = ?"
    ).bind(id).first();
    const items = await db.prepare(
      "SELECT * FROM order_items WHERE order_id = ?"
    ).bind(so.order_id).all();
    return Response.json({
      supplier_order: so,
      purchase: purchase || null,
      tracking: track || null,
      items: items.results || []
    });
  }
  const draft = path.match(/^\/api\/supplier-orders\/(\d+)\/checkout-draft$/);
  if (draft && request.method === "POST") {
    const ksBlockDraft = await killSwitchBlock(db, "checkout_draft");
    if (ksBlockDraft) return ksBlockDraft;
    const id = Number(draft[1]);
    const so = await db.prepare(
      `SELECT so.*, s.code, s.name, s.platform, s.base_url, s.checkout_method
         FROM supplier_orders so JOIN suppliers s ON s.id = so.supplier_id
        WHERE so.id = ?`
    ).bind(id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const gDraft = await guardAction(db, env2, "checkout_draft", { so });
    if (!gDraft.ok) return guardResponse(gDraft);
    const st = canonicalStatus(so.status);
    if (st !== "APPROVED") {
      return Response.json({ error: `stage1_not_approved:${so.status}`, code: 409 }, { status: 409 });
    }
    const items = JSON.parse(so.items || "[]");
    if (!items.length) return Response.json({ error: "no_items" }, { status: 409 });
    const item = items[0];
    const draftOut = SupplierCheckoutAdapter(
      {
        code: so.code,
        name: so.name,
        platform: so.platform,
        base_url: so.base_url,
        checkout_method: so.checkout_method
      },
      {
        title: item.title,
        quantity: item.quantity,
        supplier_variant_id: item.supplier_variant_id || null,
        supplier_product_id: item.supplier_product_id || null
      },
      {
        price: item.supplier_cost,
        shipping: so.supplier_shipping,
        total: so.supplier_total
      },
      { is_test: so.is_test === 1 }
      // TEST CUSTOMER for test orders — never real PII
    );
    if (draftOut.checkout_status === "DRAFT_FAILED") {
      return Response.json({ error: "draft_failed", draft: draftOut }, { status: 502 });
    }
    await db.prepare(
      `UPDATE supplier_orders SET status = 'CHECKOUT_READY', checkout_url = ?,
         checkout_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(draftOut.checkout_url, draftOut.expires_at, id).run();
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(so.order_id).first();
    await setOrderStatus(db, order, "CHECKOUT_READY");
    await audit2(
      db,
      "owner",
      "CHECKOUT_DRAFT_CREATED",
      "supplier_order",
      id,
      {
        checkout_status: draftOut.checkout_status,
        is_test: so.is_test === 1,
        total: draftOut.total,
        expires_at: draftOut.expires_at
      }
    );
    return Response.json({ ok: true, draft: draftOut, test_customer_used: so.is_test === 1 });
  }
  const purch = path.match(/^\/api\/supplier-orders\/(\d+)\/purchase$/);
  if (purch && request.method === "POST") {
    const ksBlockPurchase = await killSwitchBlock(db, "purchase");
    if (ksBlockPurchase) return ksBlockPurchase;
    const id = Number(purch[1]);
    const body = await request.json().catch(() => ({}));
    const { supplier_order_number, transaction_confirmation, payment_method } = body;
    if (!supplier_order_number || !transaction_confirmation) {
      return Response.json(
        { error: "purchase_proof_required:both_supplier_order_number_and_confirmation" },
        { status: 400 }
      );
    }
    const existing = await db.prepare(
      "SELECT id FROM supplier_purchases WHERE supplier_order_id = ?"
    ).bind(id).first();
    if (existing) return Response.json({ error: "already_purchased" }, { status: 409 });
    const so = await db.prepare("SELECT * FROM supplier_orders WHERE id = ?").bind(id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const gPurchase = await guardAction(db, env2, "purchase", { so });
    if (!gPurchase.ok) return guardResponse(gPurchase);
    if (canonicalStatus(so.status) !== "PAYMENT_PENDING_SUPPLIER") {
      return Response.json({ error: `awaiting_payment_required:${so.status}` }, { status: 409 });
    }
    const approvalRows = await db.prepare(
      `SELECT stage FROM approvals WHERE supplier_order_id = ? AND decision = 'APPROVED'`
    ).bind(id).all();
    const approvedStages = new Set((approvalRows.results || []).map((r) => Number(r.stage)));
    if (!approvedStages.has(1) || !approvedStages.has(2)) {
      return Response.json({ error: "two_approvals_required" }, { status: 409 });
    }
    try {
      await db.prepare(
        `INSERT INTO supplier_purchases (supplier_order_id, supplier_order_number,
           transaction_confirmation, payment_method, status, purchased_at)
         VALUES (?, ?, ?, ?, 'PURCHASED', datetime('now'))`
      ).bind(
        id,
        String(supplier_order_number),
        String(transaction_confirmation),
        payment_method || "google_pay"
      ).run();
    } catch (e) {
      return Response.json({ error: "already_purchased" }, { status: 409 });
    }
    await db.prepare(
      `UPDATE supplier_orders SET status = 'PURCHASED', updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(so.order_id).first();
    await setOrderStatus(db, order, "PURCHASED");
    await db.prepare(
      `INSERT INTO tracking (supplier_order_id, status) VALUES (?, 'TRACKING_PENDING')`
    ).bind(id).run();
    await audit2(
      db,
      "owner",
      "MARK_PURCHASED",
      "supplier_order",
      id,
      {
        supplier_order_number,
        transaction_confirmation: "***saved***",
        payment_method: payment_method || "google_pay"
      }
    );
    return Response.json({ ok: true, supplier_order_id: id, status: "PURCHASED" });
  }
  const cancel = path.match(/^\/api\/supplier-orders\/(\d+)\/cancel$/);
  if (cancel && request.method === "POST") {
    const id = Number(cancel[1]);
    const so = await db.prepare("SELECT * FROM supplier_orders WHERE id = ?").bind(id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const st = canonicalStatus(so.status);
    if (["PURCHASED", "COMPLETED", "SHIPPED"].includes(st)) {
      return Response.json({ error: "purchased_cannot_cancel_use_refund" }, { status: 409 });
    }
    await db.prepare(
      `UPDATE supplier_orders SET status = 'BLOCKED', blocked_reason = 'CANCELLED_BY_ADMIN',
         updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();
    await audit2(db, "owner", "SUPPLIER_ORDER_CANCELLED", "supplier_order", id, {});
    return Response.json({ ok: true });
  }
  if (path === "/api/test/create-order" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const scenario = body.scenario || "valid";
    if (![
      "valid",
      "price_changed",
      "out_of_stock",
      "unknown_shipping",
      "low_profit",
      "kill_switch",
      "supplier_unavailable",
      "multi_supplier"
    ].includes(scenario)) {
      return Response.json({ error: "unknown_scenario" }, { status: 400 });
    }
    if (await killSwitchActive(db) && scenario !== "kill_switch") {
      return Response.json({ error: "kill_switch_active:turn_off_to_run_simulator" }, { status: 409 });
    }
    const financial = body.financial_status || "paid";
    const orderNumber = "TEST-" + Date.now().toString(36).toUpperCase();
    let items = Array.isArray(body.items) && body.items.length ? body.items : [{
      shopify_variant_id: "TEST-VAR-1",
      title: body.product || "Test Product",
      sku: body.sku || "TEST-SKU-1",
      quantity: body.quantity || 1,
      price: body.price || 374.99,
      supplier_cost: body.supplier_cost || 299.9
    }];
    const groups = [];
    if (scenario === "multi_supplier") {
      groups.push({ supplier: items[0].supplier || body.supplier || "megasport", items: items.slice(0, 1) });
      groups.push({
        supplier: items[1]?.supplier || body.supplier2 || "arosport",
        items: [items[1] || { ...items[0], title: "Test Product B", sku: "TEST-SKU-2" }]
      });
    } else {
      groups.push({ supplier: body.supplier || "megasport", items });
    }
    const info3 = await db.prepare(
      `INSERT INTO orders (shopify_order_id, order_number, customer_name, customer_email,
         customer_phone, shipping_address, total_price, currency, financial_status,
         status, is_test, created_at_shopify)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ILS', ?, 'NEW', 1, datetime('now'))`
    ).bind(
      orderNumber,
      orderNumber,
      TEST_CUSTOMER.first_name + " " + TEST_CUSTOMER.last_name,
      TEST_CUSTOMER.email,
      TEST_CUSTOMER.phone,
      JSON.stringify({ test: true, address: TEST_CUSTOMER.address1, city: TEST_CUSTOMER.city }),
      items.reduce((s, i) => s + i.price * i.quantity, 0),
      financial
    ).run();
    const orderId = info3.meta.last_row_id;
    await audit2(db, "test-simulator", "TEST_ORDER_CREATED", "order", orderId, { scenario, order_number: orderNumber });
    await recordAlert(db, {
      event_type: "NEW_ORDER",
      entity_type: "order",
      entity_id: orderId,
      title: `TEST ORDER ${orderNumber} \u05E0\u05D5\u05E6\u05E8\u05D4 (scenario: ${scenario})`,
      details: { scenario, is_test: true }
    });
    if (financial !== "paid") {
      await db.prepare(`UPDATE orders SET status='PAYMENT_PENDING' WHERE id=?`).bind(orderId).run();
      return Response.json({
        ok: true,
        order_id: orderId,
        order_number: orderNumber,
        status: "PAYMENT_PENDING",
        note: "unpaid => procurement never starts (fail closed)"
      });
    }
    if (scenario === "kill_switch" || await killSwitchActive(db)) {
      await db.prepare(
        `UPDATE orders SET kill_switch_queued = 1, status = 'PAID' WHERE id = ?`
      ).bind(orderId).run();
      return Response.json({
        ok: true,
        order_id: orderId,
        order_number: orderNumber,
        status: "PAID",
        kill_switch_queued: true,
        supplier_orders: 0,
        note: "kill switch active: order saved for handling, no procurement"
      });
    }
    await db.prepare(`UPDATE orders SET status='PROCESSING' WHERE id=?`).bind(orderId).run();
    const itemIds = [];
    for (const it of items) {
      const r = await db.prepare(
        `INSERT INTO order_items (order_id, shopify_product_id, shopify_variant_id, title, sku,
           quantity, customer_price, supplier_code) VALUES (?,?,?,?,?,?,?,?)`
      ).bind(
        orderId,
        it.shopify_product_id || "TEST-PROD",
        it.shopify_variant_id,
        it.title,
        it.sku,
        it.quantity,
        it.price,
        scenario === "multi_supplier" ? it.supplier || "megasport" : groups[0].supplier
      ).run();
      itemIds.push(r.meta.last_row_id);
    }
    const results = [];
    for (const g of groups) {
      const sup = await db.prepare("SELECT * FROM suppliers WHERE code = ?").bind(g.supplier).first();
      if (!sup || sup.status !== "ACTIVE" || sup.paused || scenario === "supplier_unavailable") {
        await setOrderStatus(
          db,
          { id: orderId, status: "PROCESSING" },
          "SUPPLIER_ERROR",
          "SUPPLIER_UNAVAILABLE"
        );
        await recordAlert(db, {
          event_type: "SUPPLIER_DOWN",
          entity_type: "order",
          entity_id: orderId,
          title: `TEST: \u05E1\u05E4\u05E7 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF ${g.supplier}`,
          details: { supplier: g.supplier }
        });
        results.push({ supplier: g.supplier, decision: "BLOCKED", reason: "SUPPLIER_UNAVAILABLE" });
        continue;
      }
      const primary = g.items[0];
      const livePrice = scenario === "price_changed" ? primary.supplier_cost * 1.25 : primary.supplier_cost;
      const live = {
        ok: true,
        price: livePrice,
        currency: "ILS",
        stock: scenario === "out_of_stock" ? 0 : 5,
        availability: true,
        variant_sku: primary.sku,
        variant_size: null,
        variant_color: null,
        variant_missing: false
      };
      const mapping = {
        status: "MANUAL_VERIFIED",
        supplier_sku: primary.sku,
        size: null,
        color: null,
        store_price: primary.price,
        our_sku: primary.sku,
        approved_supplier_price: primary.supplier_cost
      };
      const ctx = {
        shipping: scenario === "unknown_shipping" ? null : body.shipping != null ? body.shipping : 29,
        fees: 0,
        settings,
        supplier_status: "ACTIVE",
        supplier_paused: 0,
        reliability: sup.reliability_score,
        min_reliability: 0.5,
        allowed_price_change_percent: 10
      };
      if (scenario === "low_profit") mapping.store_price = primary.supplier_cost * 1.02;
      const decision = evaluateLive(mapping, live, ctx);
      if (decision.decision === "READY" && decision.price_changed && scenario === "price_changed") {
        await setOrderStatus(db, { id: orderId, status: "PROCESSING" }, "PRICE_CHANGED");
        await recordAlert(db, {
          event_type: "PRICE_CHANGED",
          entity_type: "order",
          entity_id: orderId,
          title: "TEST: \u05DE\u05D7\u05D9\u05E8 \u05E1\u05E4\u05E7 \u05D4\u05E9\u05EA\u05E0\u05D4 \u2014 \u05D4\u05E8\u05DB\u05E9 \u05E0\u05D7\u05E1\u05DD",
          details: { supplier: g.supplier }
        });
        results.push({ supplier: g.supplier, decision: "BLOCKED", reason: "PRICE_CHANGED" });
        continue;
      }
      if (decision.decision !== "READY") {
        await setOrderStatus(
          db,
          { id: orderId, status: "PROCESSING" },
          decision.blocked_reason === "PROFIT_BLOCKED" ? "BLOCKED" : decision.blocked_reason === "PRICE_CHANGED" ? "PRICE_CHANGED" : decision.blocked_reason === "STOCK_UNKNOWN" || decision.blocked_reason === "STOCK_LOST" ? "OUT_OF_STOCK" : "BLOCKED",
          decision.blocked_reason
        );
        if (decision.blocked_reason === "PRICE_CHANGED") {
          await recordAlert(db, {
            event_type: "PRICE_CHANGED",
            entity_type: "order",
            entity_id: orderId,
            title: `TEST: \u05DE\u05D7\u05D9\u05E8 \u05E1\u05E4\u05E7 \u05D4\u05E9\u05EA\u05E0\u05D4 ${g.supplier}`,
            details: { supplier: g.supplier }
          });
        }
        results.push({ supplier: g.supplier, decision: "BLOCKED", reason: decision.blocked_reason });
        continue;
      }
      const subtotal = g.items.reduce((s, i) => s + i.supplier_cost * i.quantity, 0);
      const shipping = ctx.shipping || 0;
      const revenue = g.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const profit = revenue - subtotal - shipping - revenue * 0.045 - 1;
      const itemsJson = JSON.stringify(g.items.map((i) => ({
        title: i.title,
        sku: i.sku,
        quantity: i.quantity,
        supplier_cost: i.supplier_cost,
        supplier_variant_id: i.supplier_variant_id || "TEST-SUPVAR-1",
        supplier_product_id: i.supplier_product_id || "TEST-SUPPROD-1"
      })));
      const ins = await db.prepare(
        `INSERT INTO supplier_orders (order_id, supplier_id, status, items, supplier_subtotal,
           supplier_shipping, supplier_total, customer_revenue, expected_net_profit,
           expected_net_margin, is_test)
         VALUES (?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(
        orderId,
        sup.id,
        itemsJson,
        subtotal,
        shipping,
        subtotal + shipping,
        revenue,
        profit,
        revenue ? profit / revenue * 100 : 0
      ).run();
      results.push({
        supplier: g.supplier,
        decision: "READY_FOR_APPROVAL",
        supplier_order_id: ins.meta.last_row_id
      });
      await recordAlert(db, {
        event_type: "APPROVAL_REQUIRED",
        entity_type: "supplier_order",
        entity_id: ins.meta.last_row_id,
        title: `TEST: \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E8\u05DB\u05E9 ${g.supplier} (\u05E2\u05D2\u05DC\u05D4 ${orderNumber})`,
        details: { supplier: g.supplier, total: subtotal + shipping, is_test: true }
      });
    }
    const hasReady = results.some((r) => r.decision === "READY_FOR_APPROVAL");
    if (hasReady) {
      await setOrderStatus(db, { id: orderId, status: "PROCESSING" }, "READY_FOR_APPROVAL");
    }
    return Response.json({
      ok: true,
      order_id: orderId,
      order_number: orderNumber,
      is_test: true,
      scenario,
      results
    });
  }
  if (path === "/api/test/tracking" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { supplier_order_id, scenario, tracking_number, carrier } = body;
    if (!["shipped", "delivered", "tracking_missing", "shopify_failure"].includes(scenario)) {
      return Response.json({ error: "unknown_scenario" }, { status: 400 });
    }
    const so = await db.prepare("SELECT * FROM supplier_orders WHERE id = ?").bind(supplier_order_id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const track = await db.prepare(
      "SELECT * FROM tracking WHERE supplier_order_id = ?"
    ).bind(supplier_order_id).first();
    if (!track) return Response.json({ error: "purchase_required_first" }, { status: 409 });
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(so.order_id).first();
    if (scenario === "tracking_missing") {
      await audit2(db, "test-simulator", "TEST_TRACKING_MISSING", "supplier_order", supplier_order_id, {});
      return Response.json({ ok: true, note: "no tracking number from supplier \u2014 stays FULFILLMENT_PENDING, retry later" });
    }
    if (scenario === "shopify_failure") {
      await db.prepare(
        `UPDATE tracking SET status = 'SHOPIFY_SYNC_FAILED', tracking_number = ?, carrier = ?,
           updated_at = datetime('now') WHERE supplier_order_id = ?`
      ).bind(tracking_number || "MISSING", carrier || null, supplier_order_id).run();
      await audit2(db, "test-simulator", "TEST_SHOPIFY_FULFILLMENT_FAILED", "supplier_order", supplier_order_id, {});
      return Response.json({ ok: true, note: "Shopify fulfillment simulated FAILED \u2014 retry available" });
    }
    if (scenario === "shipped") {
      if (!tracking_number) return Response.json({ error: "tracking_number_required" }, { status: 400 });
      await db.prepare(
        `UPDATE tracking SET tracking_number = ?, carrier = ?, status = 'SHIPPED',
           tracking_url = ?, shipped_at = ?, shopify_fulfillment_id = ?,
           updated_at = datetime('now') WHERE supplier_order_id = ?`
      ).bind(
        tracking_number,
        carrier || "SIM",
        `https://example.com/track/${encodeURIComponent(tracking_number)}`,
        nowIso,
        "SIM-" + Date.now().toString(36),
        supplier_order_id
      ).run();
      await db.prepare(
        `UPDATE supplier_orders SET status='SHIPPED', updated_at=datetime('now') WHERE id=?`
      ).bind(supplier_order_id).run();
      const step1 = await setOrderStatus(db, order, "FULFILLMENT_PENDING");
      const step2 = await setOrderStatus(db, { id: order.id, status: "TRACKING_PENDING" }, "SHIPPED");
      if (step1.error || step2.error) {
        return Response.json({ ok: false, error: step1.error || step2.error }, { status: 409 });
      }
      await recordAlert(db, {
        event_type: "TRACKING_RECEIVED",
        entity_type: "supplier_order",
        entity_id: supplier_order_id,
        title: `TEST: \u05DE\u05E9\u05DC\u05D5\u05D7 \u05D9\u05E6\u05D0 (tracking ${tracking_number})`,
        details: { carrier: carrier || "SIM", is_test: true }
      });
      await audit2(
        db,
        "test-simulator",
        "TEST_TRACKING_SHIPPED",
        "supplier_order",
        supplier_order_id,
        { tracking_number }
      );
      return Response.json({ ok: true, status: "SHIPPED" });
    }
    if (scenario === "delivered") {
      await db.prepare(
        `UPDATE tracking SET status = 'DELIVERED', delivered_at = ?, updated_at = datetime('now')
          WHERE supplier_order_id = ?`
      ).bind(nowIso, supplier_order_id).run();
      await db.prepare(
        `UPDATE supplier_orders SET status='COMPLETED', updated_at=datetime('now') WHERE id=?`
      ).bind(supplier_order_id).run();
      const delivered = await setOrderStatus(db, order, "DELIVERED");
      if (delivered.error) {
        return Response.json({ ok: false, error: delivered.error }, { status: 409 });
      }
      await db.prepare(`UPDATE orders SET status='COMPLETED' WHERE id=?`).bind(order.id).run();
      await audit2(db, "test-simulator", "TEST_TRACKING_DELIVERED", "supplier_order", supplier_order_id, {});
      return Response.json({ ok: true, status: "DELIVERED" });
    }
  }
  if (path === "/api/test/tracking-retry" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { supplier_order_id } = body;
    const track = await db.prepare(
      "SELECT * FROM tracking WHERE supplier_order_id = ?"
    ).bind(supplier_order_id).first();
    if (!track) return Response.json({ error: "not_found" }, { status: 404 });
    if (track.status !== "SHOPIFY_SYNC_FAILED") {
      return Response.json({ error: "not_in_retry_state" }, { status: 409 });
    }
    await db.prepare(
      `UPDATE tracking SET status='SHIPPED', shipped_at = COALESCE(shipped_at, ?),
         shopify_fulfillment_id = ?, updated_at = datetime('now') WHERE supplier_order_id = ?`
    ).bind((/* @__PURE__ */ new Date()).toISOString(), "SIM-RETRY-" + Date.now().toString(36), supplier_order_id).run();
    const so = await db.prepare("SELECT * FROM supplier_orders WHERE id = ?").bind(supplier_order_id).first();
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(so.order_id).first();
    await setOrderStatus(db, order, "SHIPPED");
    await audit2(db, "test-simulator", "TEST_SHOPIFY_FULFILLMENT_RETRY_OK", "supplier_order", supplier_order_id, {});
    return Response.json({ ok: true, status: "SHIPPED_AFTER_RETRY" });
  }
  if (path === "/api/pricing/recalc" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (body.dry_run === false) {
      return Response.json({ error: "non_dry_run_disabled_in_staging" }, { status: 403 });
    }
    const report2 = await computeCatalogRecalc(db, { persist: false });
    return Response.json(report2);
  }
  if (path === "/api/eligibility/run" && request.method === "POST") {
    const report2 = await computeCatalogRecalc(db, { persist: true });
    return Response.json(report2);
  }
  if (path === "/api/eligibility" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT eligibility_status, COUNT(*) n FROM products
        WHERE eligibility_status IS NOT NULL GROUP BY eligibility_status`
    ).all();
    const blocked2 = await db.prepare(
      `SELECT eligibility_blocked_reason, COUNT(*) n FROM products
        WHERE eligibility_status = 'NOT_SELLABLE' GROUP BY eligibility_blocked_reason
        ORDER BY n DESC LIMIT 20`
    ).all();
    return Response.json({ summary: rows.results || [], blocked_reasons: blocked2.results || [] });
  }
  if (path === "/api/alerts" && request.method === "GET") {
    const rows = await listAlerts(db, {
      unread_only: url.searchParams.get("unread") === "1",
      limit: url.searchParams.get("limit")
    });
    return Response.json(rows);
  }
  const aread = path.match(/^\/api\/alerts\/(\d+)\/read$/);
  if (aread && request.method === "POST") {
    await db.prepare("UPDATE alerts SET read = 1 WHERE id = ?").bind(Number(aread[1])).run();
    return Response.json({ ok: true });
  }
  if (path === "/api/audit" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT id, actor, action, entity_type, entity_id, details, created_at
         FROM audit_log ORDER BY id DESC LIMIT ${Number(url.searchParams.get("limit")) || 200}`
    ).all();
    return Response.json(rows.results || []);
  }
  return Response.json({ error: `route_not_implemented:${path}` }, { status: 501 });
}
__name(handleOrdersApi, "handleOrdersApi");

// src/verify_page.js
var VERIFY_PAGE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sportpro - \u05D0\u05D9\u05DE\u05D5\u05EA \u05DE\u05D9\u05E4\u05D5\u05D9\u05D9\u05DD</title>
<style>
  :root{--bg:#f6f7f9;--card:#fff;--line:#e3e6ea;--txt:#1a2233;--mut:#6b7686;--ok:#0c7a43;--bad:#b3261e;--acc:#0b57d0}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--txt)}
  header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  header h1{font-size:16px;margin:0 12px 0 0}
  .tiles{display:flex;flex-wrap:wrap;gap:8px}
  .tile{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 12px;text-align:center;min-width:86px}
  .tile b{display:block;font-size:18px}
  .tile span{font-size:11px;color:var(--mut)}
  main{padding:14px 16px 80px}
  .toolbar{display:flex;gap:8px;margin:10px 0;align-items:center;flex-wrap:wrap}
  input,button,select{font:inherit}
  #tok{width:300px;padding:7px;border:1px solid var(--line);border-radius:8px}
  button{padding:7px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:pointer}
  button.pri{background:var(--acc);color:#fff;border-color:var(--acc)}
  button:disabled{opacity:.45;cursor:not-allowed}
  #tblwrap{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;max-height:62vh}
  table{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}
  th{position:sticky;top:0;background:#eef1f5;text-align:right;padding:7px 8px;border-bottom:1px solid var(--line)}
  td{padding:6px 8px;border-bottom:1px solid #eef1f5;cursor:pointer;max-width:220px;overflow:hidden;text-overflow:ellipsis}
  tr:hover td{background:#f0f6ff}
  .conf{font-weight:600}
  .pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px}
  .pill.C{background:#e6f4ea;color:var(--ok)} .pill.R{background:#fef7e0;color:#8a6d00}
  #modal{position:fixed;inset:0;background:rgba(15,20,30,.45);display:none;align-items:center;justify-content:center;padding:14px;z-index:9}
  #modal.on{display:flex}
  #box{background:var(--card);border-radius:14px;max-width:980px;width:100%;max-height:92vh;overflow:auto;padding:18px}
  #sides{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:760px){#sides{grid-template-columns:1fr}}
  .side{border:1px solid var(--line);border-radius:12px;padding:12px}
  .side h3{margin:0 0 8px;font-size:14px}
  .side img{max-width:130px;max-height:130px;border-radius:10px;display:block;margin-bottom:8px}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:4px 8px;font-size:13px}
  .kv i{color:var(--mut);font-style:normal}
  .kv b{font-weight:600;overflow-wrap:anywhere}
  .acts{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
  .note{font-size:12px;color:var(--mut);margin-top:8px}
  a{color:var(--acc)}
</style>
</head>
<body>
<header>
  <h1>\u05D0\u05D9\u05DE\u05D5\u05EA \u05DE\u05D9\u05E4\u05D5\u05D9\u05D9\u05DD - Sportpro</h1>
  <div class="tiles" id="dash"></div>
</header>
<main>
  <div class="toolbar">
    <input id="tok" type="password" placeholder="Admin token">
    <button class="pri" onclick="saveTok()">\u05D4\u05EA\u05D7\u05D1\u05E8</button>
    <button onclick="load()" id="reload">\u05E8\u05E2\u05E0\u05DF</button>
    <button id="batchBtn" onclick="batchApprove()" disabled>\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4 (\u05D6\u05D4\u05D9\u05DD)</button>
    <select id="statusSel" onchange="load()">
      <option value="CANDIDATE">Candidates</option>
      <option value="MANUAL_VERIFIED">Manual Verified</option>
      <option value="REVIEW_REQUIRED">Review Later</option>
      <option value="REJECTED">Rejected</option>
      <option value="DISCOVERY">\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA \u05E9\u05D4\u05EA\u05D2\u05DC\u05D5 (Discovery)</option>
      <optgroup label="\u2014 V3 Recovery \u2014">
      <option value="V3:auto_ready">V3: AUTO READY</option>
      <option value="V3:high_confidence">V3: HIGH CONFIDENCE</option>
      <option value="V3:sku_fix">V3: SKU FIX</option>
      <option value="V3:manual_review">V3: MANUAL REVIEW</option>
      <option value="V3:no_supplier">V3: NO SUPPLIER</option>
      <option value="V3:stock_blocked">V3: STOCK BLOCKED</option>
      <option value="V3:profit_blocked">V3: PROFIT BLOCKED</option>
      <option value="V3:shipping_blocked">V3: SHIPPING BLOCKED</option>
      </optgroup>
    </select>
    <select id="supSel" onchange="applyFilters()"><option value="">\u05DB\u05DC \u05D4\u05E1\u05E4\u05E7\u05D9\u05DD</option></select>
    <select id="confSel" onchange="applyFilters()">
      <option value="">\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: \u05D4\u05DB\u05DC</option><option value="0.9">\u2265 90%</option>
      <option value="0.95">\u2265 95%</option><option value="0.999">100%</option>
    </select>
    <input id="skuIn" placeholder="SKU\u2026" oninput="applyFilters()">
    <input id="sizeIn" placeholder="\u05DE\u05D9\u05D3\u05D4\u2026" oninput="applyFilters()">
    <input id="colorIn" placeholder="\u05E6\u05D1\u05E2\u2026" oninput="applyFilters()">
    <input id="pminIn" type="number" placeholder="\u05DE\u05D7\u05D9\u05E8 \u05DE-" oninput="applyFilters()">
    <input id="pmaxIn" type="number" placeholder="\u05DE\u05D7\u05D9\u05E8 \u05E2\u05D3-" oninput="applyFilters()">
    <button onclick="clearFilters()">\u05E0\u05E7\u05D4</button>

    <button id="liveBtn" onclick="liveBatch()" style="display:none">\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D7\u05D9\u05D4 (Live Verify)</button>
    <span id="msg" style="font-size:12px;color:var(--mut)"></span>
  </div>
  <div id="tblwrap"><table id="tbl"></table></div>
  <div class="note">\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05D9\u05E4\u05D5\u05D9 (MANUAL_VERIFIED) \u05D0\u05D9\u05E0\u05D5 \u05D4\u05D5\u05E4\u05DA \u05DE\u05D5\u05E6\u05E8 \u05DC-supplier_ready. supplier_ready=true \u05E8\u05E7 \u05DC\u05D0\u05D7\u05E8 \u05D1\u05D3\u05D9\u05E7\u05EA \u05DE\u05D7\u05D9\u05E8 \u05D5\u05DE\u05DC\u05D0\u05D9 \u05D7\u05D9\u05D4 + \u05DE\u05E0\u05D5\u05E2 \u05E8\u05D5\u05D5\u05D7 + \u05DE\u05E0\u05D5\u05E2 \u05E1\u05D9\u05DB\u05D5\u05E0\u05D9\u05DD. \u05DB\u05D5\u05EA\u05E8\u05EA \u05D3\u05D5\u05DE\u05D4 \u05D1\u05DC\u05D1\u05D3 \u05D0\u05D9\u05E0\u05D4 \u05E8\u05D0\u05D9\u05D4 - \u05E0\u05D3\u05E8\u05E9 SKU \u05D6\u05D4\u05D4 + \u05DE\u05D9\u05D3\u05D4/\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8 \u05EA\u05D5\u05D0\u05DE\u05D9\u05DD.</div>
</main>
<div id="modal" onclick="if(event.target===this)closeM()"><div id="box"></div></div>
<script>
var rows=[], allRows=[], sel=new Set();
function H(r){return 'Bearer '+r}
function saveTok(){localStorage.setItem('vt',document.getElementById('tok').value);load()}
function tok(){return localStorage.getItem('vt')||''}
function api(p,opts){return fetch(p,Object.assign({headers:{Authorization:H(tok()),'Content-Type':'application/json'}},opts||{})).then(function(r){return r.json().then(function(j){if(!r.ok)throw j;return j})})}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function msg(t){var m=document.getElementById('msg');m.textContent=t||''}

var MODE='old';
function load(){
  if(!tok()){msg('\u05D4\u05D6\u05DF token');return}
  var st=document.getElementById('statusSel').value;
  if(st.indexOf('V3:')===0){
    MODE='v3';
    var tab=st.slice(3);
    Promise.all([api('/api/recovery/state?tab='+tab+'&limit=1000'),api('/api/recovery/state/summary')])
     .then(function(a){
       allRows=a[0].rows||[]; rows=allRows;
       dashV3(a[1]);
       document.getElementById('supSel').innerHTML='<option value="">\u05D4\u05DB\u05DC</option>';
       render(); msg(rows.length+' \u05DE\u05EA\u05D5\u05DA '+a[0].total+' (\u05E2\u05DE\u05D5\u05D3 \u05E8\u05D0\u05E9\u05D5\u05DF)');
     }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error?e.error:'\u05D8\u05D5\u05E7\u05DF \u05E9\u05D2\u05D5\u05D9 \u05D0\u05D5 \u05E9\u05E8\u05EA \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF'))});
    return;
  }
  MODE='old';
  var disc=st==='DISCOVERY';
  var discUrl='/api/verify/discovery?status=NEW&limit=1000';
  Promise.all([api(disc?discUrl:'/api/verify/candidates?status='+st),api('/api/verify/summary')]).then(function(a){
    allRows=disc?a[0]:a[0]; rows=allRows; rows.forEach(function(r){var ps=r.profit_snapshot?JSON.parse(r.profit_snapshot):null;
      r.net_profit=ps&&ps.net_profit!=null?ps.net_profit:null;
      r.net_margin=ps&&ps.net_margin!=null?ps.net_margin:null;
      r.supplier_ready=r.supplier_ready===1?'YES':'no'});
    if(a[0]&&a[0]._summary){s2=a[1];s2.discovery_new=a[0]._summary.new;}
    dash(a[1]); fillSup(); applyFilters();
    document.getElementById('liveBtn').style.display=(st==='MANUAL_VERIFIED')?'':'none';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error?e.error:'\u05D8\u05D5\u05E7\u05DF \u05E9\u05D2\u05D5\u05D9 \u05D0\u05D5 \u05E9\u05E8\u05EA \u05DC\u05D0 \u05D6\u05DE\u05D9\u05DF'))})
}
function dash(s){
  var t=function(v,lab,col){return '<div class="tile"><b style="color:'+(col||'var(--txt)')+'">'+v+'</b><span>'+lab+'</span></div>'};
  document.getElementById('dash').innerHTML =
    t(s.candidates,'Candidates')+t(s.manual_verified,'Manual Verified','var(--ok)')+
    t(s.live_verified,'Live Verified')+t(s.supplier_ready_true,'Supplier Ready','var(--ok)')+
    t(s.blocked,'Blocked','var(--bad)')+t(s.review,'Review Required')+
    t(s.remaining,'Remaining');
}
function dashV3(s){
  var by={};(s.by_status||[]).forEach(function(x){by[x.status]=x.n});
  var t=function(v,lab,col){return '<div class="tile"><b style="color:'+(col||'var(--txt)')+'">'+v+'</b><span>'+lab+'</span></div>'};
  document.getElementById('dash').innerHTML=
    t(s.total,'\u05E1\u05D4\u05DB \u05D5\u05E8\u05D9\u05D0\u05E6\u05D9\u05D5\u05EA')+
    t(by['AUTO_READY']||0,'AUTO READY','var(--ok)')+
    t(by['NEEDS_OWNER_APPROVAL']||0,'\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8')+
    t(by['NEEDS_DATA_FIX']||0,'\u05EA\u05D9\u05E7\u05D5\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD')+
    t(s.sku_fix||0,'\u05EA\u05D9\u05E7\u05D5\u05E0\u05D9 SKU')+
    t(by['NEEDS_STOCK']||0,'\u05DE\u05DC\u05D0\u05D9 \u05D7\u05E1\u05D5\u05DD','var(--bad)')+
    t(by['PROFIT_BLOCKED']||0,'\u05E8\u05D5\u05D5\u05D7 \u05D7\u05E1\u05D5\u05DD','var(--bad)')+
    t(by['NO_SUPPLIER']||0,'\u05D1\u05DC\u05D9 \u05E1\u05E4\u05E7');
}
var STATE_COLS=[['title','\u05DE\u05D5\u05E6\u05E8'],['vtitle','\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8'],['sku','SKU'],['size','\u05DE\u05D9\u05D3\u05D4'],['color','\u05E6\u05D1\u05E2'],
 ['price','\u05DE\u05D7\u05D9\u05E8'],['status','\u05E1\u05D8\u05D8\u05D5\u05E1'],['conf','\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF'],['match_method','\u05E9\u05D9\u05D8\u05D4'],['supplier','\u05E1\u05E4\u05E7'],
 ['supplier_sku','SKU \u05E1\u05E4\u05E7'],['supplier_price','\u05DE\u05D7\u05D9\u05E8 \u05E1\u05E4\u05E7'],['live_stock','\u05DE\u05DC\u05D0\u05D9 \u05D7\u05D9'],
 ['net_a','\u05E8\u05D5\u05D5\u05D7 A'],['net_b','\u05E8\u05D5\u05D5\u05D7 B'],['proposed_sku','SKU \u05DE\u05D5\u05E6\u05E2']];
var LIVE_COLS=[['live_status','Live'],['live_price','Live Price'],['live_stock','Live Stock'],
 ['net_profit','Net Profit'],['net_margin','Margin'],['blocked_reason','Blocked Reason'],
 ['live_checked_at','Last Live Check'],['supplier_ready','Ready']];
var COLS=[['shopify_product_title','Shopify Product'],['id','#'],['shopify_variant_id','Shopify Variant'],
 ['supplier_sku','Shopify SKU'],['size','Size'],['color','Color'],['supplier_code','Supplier'],
 ['supplier_product_title','Supplier Product'],['supplier_variant_title','Supplier Variant'],
 ['supplier_variant_sku','Supplier SKU'],['supplier_size','S.Size'],['supplier_color','S.Color'],
 ['supplier_price','S.Price'],['mapping_confidence','Conf.'],['mapping_status','Status']];
function fillSup(){
  var seen={};allRows.forEach(function(r){seen[r.supplier_code]=1});
  var el=document.getElementById('supSel');var cur=el.value;
  el.innerHTML='<option value="">\u05DB\u05DC \u05D4\u05E1\u05E4\u05E7\u05D9\u05DD</option>'+Object.keys(seen).sort().map(function(c){return '<option'+(c===cur?' selected':'')+'>'+esc(c)+'</option>'}).join('');
}
function applyFilters(){
  var sup=document.getElementById('supSel').value;
  var cf=parseFloat(document.getElementById('confSel').value);
  var sk=(document.getElementById('skuIn').value||'').trim().toLowerCase();
  var sz=(document.getElementById('sizeIn').value||'').trim().toLowerCase();
  var co=(document.getElementById('colorIn').value||'').trim().toLowerCase();
  var pmin=parseFloat(document.getElementById('pminIn').value);
  var pmax=parseFloat(document.getElementById('pmaxIn').value);
  rows=allRows.filter(function(r){
    if(sup&&r.supplier_code!==sup)return false;
    if(!isNaN(cf)&&r.mapping_confidence<cf)return false;
    if(sk&&!((r.supplier_sku||r.supplier_variant_sku||'')+'').toLowerCase().includes(sk))return false;
    if(sz&&!((r.size||r.supplier_size||'')+'').toLowerCase().includes(sz))return false;
    if(co&&!((r.color||r.supplier_color||'')+'').toLowerCase().includes(co))return false;
    if(!isNaN(pmin)&&!(r.supplier_price!=null&&r.supplier_price>=pmin))return false;
    if(!isNaN(pmax)&&!(r.supplier_price!=null&&r.supplier_price<=pmax))return false;
    return true;
  });
  render();
  msg(rows.length+' \u05DE\u05EA\u05D5\u05DA '+allRows.length);
}
function clearFilters(){
  ['supSel','confSel'].forEach(function(id){document.getElementById(id).value=''});
  ['skuIn','sizeIn','colorIn','pminIn','pmaxIn'].forEach(function(id){document.getElementById(id).value=''});
  applyFilters();
}
function render(){
  sel.clear(); updBatch();
  var stv=document.getElementById('statusSel').value;
  if(MODE==='v3'){
    var h='<tr><th></th>'+STATE_COLS.map(function(c){return '<th>'+c[1]+'</th>'}).join('')+'</tr>';
    rows.forEach(function(r,i){
      h+='<tr onclick="openM('+i+')"><td></td>'+STATE_COLS.map(function(c){var v=r[c[0]];
        if(c[0]==='conf'&&v!=null)v=(100*v).toFixed(0)+'%';
        if((c[0]==='net_a'||c[0]==='net_b')&&v!=null)v=v.toFixed(1)+' \u20AA';
        if(c[0]==='price'||c[0]==='supplier_price')v=v!=null?v+' \u20AA':'';
        return '<td title="'+esc(v)+'">'+esc(v)+'</td>'}).join('')+'</tr>';
    });
    document.getElementById('tbl').innerHTML=h;
    return;
  }
  var cols=COLS.concat(stv==='MANUAL_VERIFIED'?LIVE_COLS:[]).concat(stv==='DISCOVERY'?[['match_reason','Reason'],['last_seen_at','Last Seen'],['supplier_stock','S.Stock']]:[]);
  var h='<tr><th></th>'+cols.map(function(c){return '<th>'+c[1]+'</th>'}).join('')+'</tr>';
  rows.forEach(function(r,i){
    h+='<tr onclick="openM('+i+')"><td onclick="event.stopPropagation();toggle('+i+',this)"><input type="checkbox" data-i="'+i+'" '+(sel.has(i)?'checked':'')+'></td>'+
      cols.map(function(c){var v=r[c[0]];if(c[0]==='mapping_confidence')v=(100*v).toFixed(0)+'%';
        if(c[0]==='net_margin'&&v!=null)v=v.toFixed(2)+'%';
        if(c[0]==='net_profit'&&v!=null)v=v.toFixed(2)+' \u20AA';
        return '<td title="'+esc(v)+'">'+esc(v)+'</td>'}).join('')+'</tr>';
  });
  document.getElementById('tbl').innerHTML=h;
  msg(rows.length+' \u05DE\u05D5\u05E2\u05DE\u05D3\u05D9\u05DD');
}
function toggle(i,cb){var b=document.querySelector('input[data-i="'+i+'"]');if(sel.has(i)){sel.delete(i);b.checked=false}else{sel.add(i);b.checked=true}updBatch()}
function group(i){var r=rows[i];return [r.supplier_code,r.supplier_variant_sku,r.supplier_variant_id,r.size,r.color,r.supplier_product_title].join('|')}
function updBatch(){
  if(MODE==='v3'){document.getElementById('batchBtn').disabled=true;document.getElementById('batchBtn').textContent='\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4 (\u05D1\u05EA\u05D5\u05E8 \u05D4\u05D2\u05D9\u05DC\u05D5\u05D9)';return}
  var ok=sel.size>1, first=null;
  sel.forEach(function(i){if(first===null)first=group(i);else if(group(i)!==first)ok=false});
  var allC=[].every; // statuses
  document.getElementById('batchBtn').disabled=!ok;
  document.getElementById('batchBtn').textContent=ok?('\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4 ('+sel.size+' \u05D6\u05D4\u05D9\u05DD)'):'\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4 (\u05D6\u05D4\u05D9\u05DD)';
}
function openM(i){
  var r=rows[i];
  if(MODE==='v3'){
    var sp='<div class="side"><h3>Sportpro</h3>'+
      (r.image?'<img src="'+esc(r.image)+'">':'')+
      kv('\u05DE\u05D5\u05E6\u05E8',r.title)+kv('\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8',r.vtitle)+kv('SKU',r.sku||'(\u05D7\u05E1\u05E8)')+
      kv('\u05DE\u05D9\u05D3\u05D4',r.size)+kv('\u05E6\u05D1\u05E2',r.color)+kv('\u05DE\u05D7\u05D9\u05E8',r.price!=null?r.price+' \u20AA':'')+'</div>';
    var supUrl=r.supplier?('https://'+r.supplier+'.co.il/search?q='+encodeURIComponent(r.supplier_sku||r.title||'')):'';
    var spf='<div class="side"><h3>\u05E1\u05E4\u05E7 ('+esc(r.supplier||'-')+')</h3>'+
      kv('SKU \u05E1\u05E4\u05E7',r.supplier_sku)+kv('\u05DE\u05D9\u05D3\u05D4 \u05E1\u05E4\u05E7',r.size)+
      kv('\u05DE\u05D7\u05D9\u05E8 \u05D7\u05D9',r.supplier_price!=null?r.supplier_price+' \u20AA':'')+
      kv('\u05DE\u05DC\u05D0\u05D9 \u05D7\u05D9',r.live_stock)+kv('\u05E0\u05D1\u05D3\u05E7',r.last_seen)+
      (supUrl?'<a href="'+esc(supUrl)+'" target="_blank">\u05E2\u05DE\u05D5\u05D3 \u05D7\u05D9\u05E4\u05D5\u05E9 \u05D0\u05E6\u05DC \u05D4\u05E1\u05E4\u05E7</a>':'')+'</div>';
    var dec='<div class="side"><h3>Decision</h3>'+
      kv('\u05E1\u05D8\u05D8\u05D5\u05E1',r.status)+kv('\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF',r.conf!=null?(100*r.conf).toFixed(0)+'%':'')+
      kv('\u05E9\u05D9\u05D8\u05D4',r.match_method)+kv('\u05E1\u05D9\u05D1\u05D4',r.match_reason)+
      kv('\u05E8\u05D5\u05D5\u05D7 A',r.net_a!=null?r.net_a+' \u20AA ('+(r.margin_a||0).toFixed(1)+'%)':'')+
      kv('\u05E8\u05D5\u05D5\u05D7 B',r.net_b!=null?r.net_b+' \u20AA ('+(r.margin_b||0).toFixed(1)+'%)':'')+
      kv('\u05DE\u05E9\u05DC\u05D5\u05D7',r.ship_status+(r.ship_cost!=null?(' / '+r.ship_cost+' \u20AA'):''))+
      kv('\u05D8\u05E8\u05D9\u05D5\u05EA',r.last_seen)+kv('\u05E4\u05E2\u05D5\u05DC\u05D4 \u05E0\u05D3\u05E8\u05E9\u05EA',r.reasons)+'</div>';
    document.getElementById('box').innerHTML='<div id="sides" style="grid-template-columns:1fr 1fr 1fr">'+sp+spf+dec+'</div>'+
      '<div class="acts"><button class="pri" onclick="v3act('+i+','approve')">APPROVE</button>'+
      '<button onclick="v3act('+i+','reject')">REJECT</button>'+
      '<button onclick="v3act('+i+','review')">REVIEW</button>'+
      '<button onclick="closeM()">\u05E1\u05D2\u05D5\u05E8</button></div>'+
      '<div class="note">APPROVE \u05E2\u05D5\u05D1\u05E8 \u05D3\u05E8\u05DA \u05D4\u05E9\u05E8\u05E9\u05E8\u05EA \u05D4\u05E6\u05D3-\u05E9\u05E8\u05EA \u05D4\u05DE\u05DC\u05D0\u05D4 (\u05D2\u05D9\u05DC\u05D5\u05D9\u2192\u05D0\u05D9\u05E9\u05D5\u05E8\u2192\u05DE\u05D9\u05E4\u05D5\u05D9). \u05D0\u05DD \u05D0\u05D9\u05DF \u05DE\u05D5\u05E2\u05DE\u05D3 \u05D2\u05D9\u05DC\u05D5\u05D9 \u05EA\u05D5\u05D0\u05DD \u2014 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05EA\u05D9\u05D7\u05E1\u05DD. \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05DE\u05E6\u05D9\u05D1 supplier_ready=true.</div>';
    document.getElementById('modal').className='on';
    return;
  }
  var sp='<div class="side"><h3>\u05E6\u05D3 Sportpro</h3>'+
    (r.shopify_image_url?'<img src="'+esc(r.shopify_image_url)+'">':'')+
    kv('\u05DE\u05D5\u05E6\u05E8',r.shopify_product_title)+kv('\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8',r.shopify_variant_id)+kv('SKU',r.supplier_sku)+
    kv('\u05DE\u05D9\u05D3\u05D4',r.size)+kv('\u05E6\u05D1\u05E2',r.color)+kv('\u05DE\u05D7\u05D9\u05E8 \u05D7\u05E0\u05D5\u05EA',r.shopify_price!=null?r.shopify_price+' \u20AA':'')+'</div>';
  var spf='<div class="side"><h3>\u05E6\u05D3 \u05E1\u05E4\u05E7 ('+esc(r.supplier_name||r.supplier_code)+')</h3>'+
    (r.supplier_product_image?'<img src="'+esc(r.supplier_product_image)+'">':'')+
    kv('\u05DE\u05D5\u05E6\u05E8',r.supplier_product_title)+kv('\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8',r.supplier_variant_title)+kv('SKU',r.supplier_variant_sku)+
    kv('\u05DE\u05D9\u05D3\u05D4',r.supplier_size)+kv('\u05E6\u05D1\u05E2',r.supplier_color)+
    kv('\u05DE\u05D7\u05D9\u05E8 \u05D2\u05D9\u05DC\u05D5\u05D9',r.supplier_price!=null?r.supplier_price+' '+esc(r.currency||'ILS'):'')+
    kv('\u05DE\u05DC\u05D0\u05D9 \u05D2\u05D9\u05DC\u05D5\u05D9',r.supplier_stock)+kv('\u05E0\u05E8\u05D0\u05D4 \u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4',r.last_seen_at)+
    kv('\u05E7\u05D9\u05E9\u05D5\u05E8',r.supplier_product_url?'<a href="'+esc(r.supplier_product_url)+'" target="_blank">\u05E2\u05DE\u05D5\u05D3 \u05D4\u05E1\u05E4\u05E7</a>':'')+'</div>';
  var liveBtn=r.mapping_status==='MANUAL_VERIFIED'?'<button onclick="liveOne('+r.id+')">\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D7\u05D9\u05D4</button>':'';
  document.getElementById('box').innerHTML='<div id="sides">'+sp+spf+'</div>'+
    '<div class="acts"><button class="pri" onclick="act('+i+',\\'approve\\')">APPROVE MAPPING</button>'+
    '<button onclick="act('+i+',\\'reject\\')">REJECT</button>'+
    '<button onclick="act('+i+',\\'review\\')">REVIEW LATER</button>'+liveBtn+
    '<button onclick="closeM()">\u05E1\u05D2\u05D5\u05E8</button></div>'+
    '<div class="note">Live: '+esc(r.live_status||'\u05D8\u05E8\u05DD \u05E0\u05D1\u05D3\u05E7')+' | \u05DE\u05D7\u05D9\u05E8 \u05D7\u05D9: '+esc(r.live_price!=null?r.live_price:'-')+' | \u05DE\u05DC\u05D0\u05D9 \u05D7\u05D9: '+esc(r.live_stock!=null?r.live_stock:'-')+' | \u05D7\u05E1\u05D9\u05DE\u05D4: '+esc(r.blocked_reason||'-')+'</div>'+
    '<div class="note">\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF: '+(100*r.mapping_confidence).toFixed(0)+'% | \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05DE\u05E6\u05D9\u05D1 supplier_ready=true</div>';
  document.getElementById('modal').className='on';
}
function v3act(i,type){
  var r=rows[i];
  api('/api/recovery/state/lookup?vid='+encodeURIComponent(r.vid))
   .then(function(l){
     if(!l.id){msg('\u05D0\u05D9\u05DF \u05DE\u05D5\u05E2\u05DE\u05D3 \u05D2\u05D9\u05DC\u05D5\u05D9 NEW \u05DC\u05D5\u05D5\u05E8\u05D9\u05D0\u05E6\u05D9\u05D4 \u05D6\u05D5 \u2014 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D0\u05E4\u05E9\u05E8\u05D9 \u05E8\u05E7 \u05D3\u05E8\u05DA \u05EA\u05D5\u05E8 \u05D4\u05D2\u05D9\u05DC\u05D5\u05D9 \u05D0\u05D5 \u05DE\u05D9\u05E4\u05D5\u05D9 \u05D9\u05D3\u05E0\u05D9');return}
     if(type==='approve'){
       var low=(l.confidence||0)<0.90;
       if(!low||confirm('\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05E0\u05DE\u05D5\u05DA ('+(100*(l.confidence||0)).toFixed(0)+'%). \u05DC\u05D0\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA?')){
         api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:l.id})})
          .then(function(res){msg('\u05D0\u05D5\u05E9\u05E8 \u05D3\u05E8\u05DA \u05E9\u05E8\u05E9\u05E8\u05EA \u05D4\u05D2\u05D9\u05DC\u05D5\u05D9 \u2713');closeM();load()})
          .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
       }
     } else if(type==='reject'){
       api('/api/verify/discovery/reject',{method:'POST',body:JSON.stringify({id:l.id})})
        .then(function(){msg('\u05E0\u05D3\u05D7\u05D4');closeM();load()})
        .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
     } else { msg('\u05E1\u05D5\u05DE\u05DF \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA (\u05DC\u05DC\u05D0 \u05E9\u05D9\u05E0\u05D5\u05D9 \u05D1\u05DE\u05E1\u05D3)'); }
   }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function kv(k,v){return '<i>'+k+'</i><b>'+esc(v)+'</b>'}
function closeM(){document.getElementById('modal').className=''}
function act(i,type){
  var r=rows[i];
  var disc=document.getElementById('statusSel').value==='DISCOVERY';
  if(disc&&type==='approve'){
    var low=(r.mapping_confidence||0)<0.90;
    if(!low||confirm('\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05E0\u05DE\u05D5\u05DA ('+(100*r.mapping_confidence).toFixed(0)+'%, '+esc(r.match_reason||'')+'). \u05DC\u05D0\u05E9\u05E8 \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA?'))
      api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:r.id})})
       .then(function(res){msg('\u05D0\u05D5\u05E9\u05E8: '+r.shopify_product_title+(res.mapping_created?' (\u05DE\u05D9\u05E4\u05D5\u05D9 \u05E0\u05D5\u05E6\u05E8)':' (\u05DE\u05D9\u05E4\u05D5\u05D9 \u05E7\u05D9\u05D9\u05DD)'));closeM();load()})
       .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
    else msg('\u05DC\u05D0 \u05D0\u05D5\u05E9\u05E8');
    return;
  }
  if(disc&&type==='reject'){
    api('/api/verify/discovery/reject',{method:'POST',body:JSON.stringify({id:r.id})})
     .then(function(){msg('\u05E0\u05D3\u05D7\u05D4: '+r.shopify_product_title);closeM();load()})
     .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
    return;
  }
  if(disc){msg('\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05D1\u05DE\u05E6\u05D1 \u05D2\u05D9\u05DC\u05D5\u05D9');return}
  api('/api/verify/'+type,{method:'POST',body:JSON.stringify({id:r.id})})
   .then(function(res){msg((type==='approve'?'\u05D0\u05D5\u05E9\u05E8: ':(type==='reject'?'\u05E0\u05D3\u05D7\u05D4: ':'\u05E1\u05D5\u05DE\u05DF \u05DC\u05D1\u05D3\u05D9\u05E7\u05D4: '))+r.shopify_product_title);closeM();load()})
   .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))})
}
function liveOne(id){
  api('/api/mappings/'+id+'/verify-live',{method:'POST',body:'{}'})
   .then(function(res){msg(res.decision==='READY'?'supplier_ready=true (\u05DE\u05DC\u05D0)':('\u05E0\u05D7\u05E1\u05DD: '+res.blocked_reason));load()})
   .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))})
}
function liveBatch(){
  var ids=[];rows.forEach(function(r){ids.push(r.id)});
  if(!confirm('\u05DC\u05D4\u05E8\u05D9\u05E5 \u05D1\u05D3\u05D9\u05E7\u05D4 \u05D7\u05D9\u05D4 \u05DC-'+ids.length+' \u05DE\u05D9\u05E4\u05D5\u05D9\u05D9\u05DD \u05DE\u05D0\u05D5\u05E9\u05E8\u05D9\u05DD? \u05D0\u05D9\u05DF \u05E8\u05DB\u05D9\u05E9\u05D4, \u05E8\u05E7 \u05D1\u05D3\u05D9\u05E7\u05D4.'))return;
  msg('\u05DE\u05E8\u05D9\u05E5 \u05D1\u05D3\u05D9\u05E7\u05D5\u05EA \u05D7\u05D9\u05D5\u05EA...');
  api('/api/mappings/verify-live-batch',{method:'POST',body:JSON.stringify({ids:ids})})
   .then(function(res){msg('\u05E0\u05D1\u05D3\u05E7\u05D5 '+res.checked+' | READY: '+res.ready+' | BLOCKED: '+res.blocked);load()})
   .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))})
}
function batchApprove(){
  var ids=[];sel.forEach(function(i){ids.push(rows[i].id)});
  var disc=document.getElementById('statusSel').value==='DISCOVERY';
  if(!confirm('\u05DC\u05D0\u05E9\u05E8 '+ids.length+' \u05DE\u05D9\u05E4\u05D5\u05D9\u05D9\u05DD \u05D6\u05D4\u05D9\u05DD (\u05D0\u05D5\u05EA\u05D5 \u05E1\u05E4\u05E7, SKU, \u05DE\u05D9\u05D3\u05D4, \u05E6\u05D1\u05E2)?'))return;
  api(disc?'/api/verify/discovery/batch-approve':'/api/verify/batch-approve',{method:'POST',body:JSON.stringify({ids:ids})})
   .then(function(res){msg('\u05D0\u05D5\u05E9\u05E8\u05D5 '+res.approved+' \u05DE\u05D9\u05E4\u05D5\u05D9\u05D9\u05DD');load()})
   .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))})
}
document.getElementById('tok').value=tok();
if(tok())load();
<\/script>
</body>
</html>`;

// src/recovery/engine.js
function computeShipping(rules, { category, subtotal, freeShip, bulky }) {
  if (!Array.isArray(rules)) return { cost: null, status: "UNKNOWN" };
  for (const rule of rules) {
    if (rule.type === "free_above") {
      if (rule.categories && !rule.categories.includes(category)) continue;
      if (rule.exclusions && bulky) continue;
      if (subtotal != null && subtotal >= rule.threshold) {
        return {
          cost: rule.cost ?? 0,
          status: "VERIFIED",
          conditions: `subtotal>=${rule.threshold}` + (rule.categories ? ` categories=${rule.categories.join(",")}` : "") + (rule.exclusions ? ` excl=${rule.exclusions}` : "")
        };
      }
      continue;
    }
    if (rule.type === "fixed") {
      if (rule.categories && !rule.categories.includes(category)) continue;
      if (rule.below != null && subtotal != null && subtotal >= rule.below) continue;
      return {
        cost: rule.cost,
        status: "VERIFIED",
        conditions: `fixed${rule.categories ? ` categories=${rule.categories.join(",")}` : ""}${rule.below != null ? ` below=${rule.below}` : ""}`
      };
    }
    if (rule.type === "product_flag") {
      if (freeShip) return { cost: 0, status: "VERIFIED", conditions: "product tagged free shipping" };
      continue;
    }
    if (rule.type === "pickup") {
      return { cost: rule.cost, status: "OPTION_PICKUP", conditions: rule.conditions || null };
    }
    if (rule.type === "unknown") return { cost: null, status: "UNKNOWN" };
  }
  return { cost: null, status: "UNKNOWN" };
}
__name(computeShipping, "computeShipping");
function quoteShipping(db, { supplierCode, category, subtotal, freeShip, bulky }) {
  return db.prepare("SELECT rules_json, source, verified_at, verified_by FROM shipping_policies WHERE supplier_code = ?").bind(supplierCode).first().then((row) => {
    if (!row) return { supplier: supplierCode, cost: null, status: "UNKNOWN", reason: "no_policy" };
    const q = computeShipping(safeParse2(row.rules_json), { category, subtotal, freeShip, bulky });
    return { supplier: supplierCode, ...q, source: row.source, verified_at: row.verified_at, verified_by: row.verified_by };
  });
}
__name(quoteShipping, "quoteShipping");
function safeParse2(v) {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
__name(safeParse2, "safeParse");

// src/recovery/api.js
var AUDIT = /* @__PURE__ */ __name((db, action, entity, id, details) => db.prepare("INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)").bind("owner-manual", action, entity, String(id), JSON.stringify(details || {})).run(), "AUDIT");
async function handleRecoveryApi(request, env2, url) {
  const path = url.pathname;
  const db = env2.DB;
  const method = request.method;
  if (path === "/api/recovery/mint-token") {
    // SPORTPRO PHASE 1A: removed. This endpoint returned a full Shopify Admin access token.
    return Response.json({ error: "endpoint_removed" }, { status: 410 });
  }
  if (path === "/api/recovery/discovery-import" && method === "POST") {
    const body = await request.json();
    const items = Array.isArray(body.candidates) ? body.candidates : [];
    if (!items.length) return Response.json({ error: "candidates_required" }, { status: 400 });
    let inserted = 0;
    const INSERT = `INSERT INTO discovery_candidates
       (shopify_product_id, shopify_variant_id, our_sku, our_size, our_color, our_title, our_price,
        supplier_code, supplier_product_id, supplier_variant_id, supplier_variant_title,
        supplier_sku, supplier_size, supplier_color, supplier_price, supplier_stock,
        last_seen_at, live_src, match_reason, confidence)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT (shopify_variant_id, supplier_code, supplier_sku) DO NOTHING`;
    for (let i = 0; i < items.length; i += 20) {
      const chunk2 = items.slice(i, i + 20);
      const prepared = chunk2.map((d) => db.prepare(INSERT).bind(
        String(d.pid || d.shopify_product_id || ""),
        String(d.vid || d.shopify_variant_id || ""),
        d.our_sku ?? d.sku ?? null,
        d.our_size ?? d.size ?? null,
        d.our_color ?? d.color ?? null,
        d.our_title ?? d.title ?? null,
        d.our_price ?? d.price ?? null,
        d.supplier,
        d.supplier_product_id ?? null,
        d.supplier_variant_id ?? null,
        d.supplier_variant_title ?? null,
        d.supplier_sku ?? d.sku ?? null,
        d.supplier_size ?? d.size ?? null,
        d.supplier_color ?? d.color ?? null,
        d.supplier_price ?? null,
        d.supplier_stock ?? null,
        d.last_seen ?? d.last_seen_at ?? null,
        d.live_src ?? null,
        d.match_reason ?? null,
        d.conf ?? d.confidence ?? null
      ));
      await db.batch(prepared);
      inserted += chunk2.length;
    }
    return Response.json({ ok: true, received: items.length, inserted });
  }
  if (path === "/api/verify/discovery" && method === "GET") {
    const status = url.searchParams.get("status") || "NEW";
    const supplier = url.searchParams.get("supplier");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 1e3);
    const sql = `SELECT d.*, s.name AS supplier_name, s.status AS supplier_status
                 FROM discovery_candidates d
                 LEFT JOIN suppliers s ON s.code = d.supplier_code
                 WHERE d.status = ? ${supplier ? "AND d.supplier_code = ?" : ""}
                 ORDER BY d.confidence DESC, d.supplier_price DESC LIMIT ${limit}`;
    const bound = supplier ? [status, supplier] : [status];
    const rows = (await db.prepare(sql).bind(...bound).all()).results || [];
    const list = rows.map((r) => ({
      id: r.id,
      shopify_product_title: r.our_title,
      shopify_variant_id: r.shopify_variant_id,
      shopify_price: r.our_price,
      supplier_sku: r.our_sku,
      size: r.our_size,
      color: r.our_color,
      supplier_code: r.supplier_code,
      supplier_name: r.supplier_name,
      supplier_product_id: r.supplier_product_id,
      supplier_variant_id: r.supplier_variant_id,
      supplier_variant_title: r.supplier_variant_title,
      supplier_variant_sku: r.supplier_sku,
      supplier_size: r.supplier_size,
      supplier_color: r.supplier_color,
      supplier_price: r.supplier_price,
      supplier_stock: r.supplier_stock,
      last_seen_at: r.last_seen_at,
      live_src: r.live_src,
      mapping_confidence: r.confidence,
      mapping_status: r.status,
      match_reason: r.match_reason
    }));
    const t = /* @__PURE__ */ __name((x) => db.prepare(`SELECT COUNT(*) n FROM discovery_candidates WHERE status='${x}'`).first().then((r) => r.n), "t");
    const [nw, ap, rj] = await Promise.all([t("NEW"), t("APPROVED"), t("REJECTED")]);
    return Response.json(Object.assign(list.length ? list : [], { _summary: { new: nw, approved: ap, rejected: rj } }));
  }
  if (path === "/api/verify/discovery/approve" && method === "POST") {
    const b = await request.json();
    if (!b.id) return Response.json({ error: "id_required" }, { status: 400 });
    const d = await db.prepare("SELECT * FROM discovery_candidates WHERE id = ?").bind(b.id).first();
    if (!d) return Response.json({ error: "not_found" }, { status: 404 });
    if (d.status !== "NEW") return Response.json({ error: "only_new_can_be_approved" }, { status: 409 });
    const conf = d.confidence || 0;
    if (conf < 0.65) return Response.json({ error: "confidence_too_low" }, { status: 409 });
    if (!(conf >= 0.9))
      return Response.json({ error: "confidence_below_0_90", confidence: conf }, { status: 409 });
    if (!d.supplier_variant_id)
      return Response.json({ error: "missing_supplier_variant_id" }, { status: 409 });
    const sup = await db.prepare("SELECT id, status, paused FROM suppliers WHERE code = ?").bind(d.supplier_code).first();
    if (!sup) return Response.json({ error: "supplier_not_registered" }, { status: 409 });
    if (d.supplier_size && d.our_size && String(d.supplier_size) !== String(d.our_size))
      return Response.json({ error: "size_mismatch_at_approval", ours: d.our_size, theirs: d.supplier_size }, { status: 409 });
    const created = await createMapping(db, d, sup.id);
    await db.prepare("UPDATE discovery_candidates SET status='APPROVED' WHERE id = ?").bind(d.id).run();
    await AUDIT(
      db,
      "DISCOVERY_APPROVE",
      "discovery_candidate",
      d.id,
      { supplier: d.supplier_code, sku: d.supplier_sku, conf, mapping_created: created, low_conf: conf < 0.9 }
    );
    return Response.json({ ok: true, mapping_created: created, supplier_ready: false });
  }
  if (path === "/api/verify/discovery/reject" && method === "POST") {
    const b = await request.json();
    if (!b.id) return Response.json({ error: "id_required" }, { status: 400 });
    const d = await db.prepare("SELECT * FROM discovery_candidates WHERE id = ?").bind(b.id).first();
    if (!d) return Response.json({ error: "not_found" }, { status: 404 });
    if (d.status !== "NEW") return Response.json({ error: "only_new_can_be_rejected" }, { status: 409 });
    await db.prepare("UPDATE discovery_candidates SET status='REJECTED' WHERE id = ?").bind(d.id).run();
    await AUDIT(db, "DISCOVERY_REJECT", "discovery_candidate", d.id, { reason: b.reason || null, supplier: d.supplier_code, sku: d.supplier_sku });
    return Response.json({ ok: true });
  }
  if (path === "/api/verify/discovery/batch-approve" && method === "POST") {
    const b = await request.json();
    const ids = Array.isArray(b.ids) ? b.ids.map(Number) : [];
    if (ids.length < 2) return Response.json({ error: "ids_min_2" }, { status: 400 });
    const rows = await db.prepare("SELECT * FROM discovery_candidates WHERE id IN (" + ids.join(",") + ")").all();
    const ds = rows.results || [];
    if (ds.length !== ids.length) return Response.json({ error: "some_not_found" }, { status: 404 });
    const first = ds[0];
    const same = ds.every((d) => d.status === "NEW" && d.supplier_code === first.supplier_code && (d.supplier_sku || "") === (first.supplier_sku || "") && (d.supplier_size || "") === (first.supplier_size || "") && (d.supplier_color || "") === (first.supplier_color || ""));
    if (!same) return Response.json(
      {
        error: "batch_conditions_violated",
        requirement: "same supplier + exact SKU + exact size + exact color"
      },
      { status: 409 }
    );
    const low = ds.filter((d) => (d.confidence || 0) < 0.9);
    if (low.length) return Response.json({ error: "batch_requires_conf_ge_90", count: low.length }, { status: 409 });
    const sup = await db.prepare("SELECT id FROM suppliers WHERE code = ?").bind(first.supplier_code).first();
    if (!sup) return Response.json({ error: "supplier_not_registered" }, { status: 409 });
    let approved = 0, mappings = 0;
    for (const d of ds) {
      const created = await createMapping(db, d, sup.id);
      await db.prepare("UPDATE discovery_candidates SET status='APPROVED' WHERE id = ?").bind(d.id).run();
      if (created) mappings++;
      approved++;
    }
    await AUDIT(
      db,
      "DISCOVERY_BATCH_APPROVE",
      "discovery_candidates",
      ids.join(","),
      { supplier: first.supplier_code, sku: first.supplier_sku, approved, mappings }
    );
    return Response.json({ ok: true, approved, mapping_created: mappings, supplier_ready: false });
  }
  if (path === "/api/shipping/policies" && method === "GET") {
    const rows = (await db.prepare("SELECT p.*, s.status AS supplier_status FROM shipping_policies p LEFT JOIN suppliers s ON s.code = p.supplier_code").all()).results || [];
    return Response.json(rows.map((r) => ({
      supplier: r.supplier_code,
      rules: JSON.parse(r.rules_json),
      source: r.source,
      verified_at: r.verified_at,
      verified_by: r.verified_by,
      supplier_status: r.supplier_status || "UNREGISTERED"
    })));
  }
  if (path === "/api/shipping/policies/import" && method === "POST") {
    const body = await request.json();
    const pols = Array.isArray(body.policies) ? body.policies : [];
    if (!pols.length) return Response.json({ error: "policies_required" }, { status: 400 });
    let n = 0;
    for (const p of pols) {
      if (!p.supplier || !Array.isArray(p.rules)) continue;
      await db.prepare(
        `INSERT INTO shipping_policies (supplier_code, rules_json, source, verified_at, verified_by)
         VALUES (?,?,?,?,?)
         ON CONFLICT (supplier_code) DO UPDATE SET rules_json=excluded.rules_json,
           source=excluded.source, verified_at=excluded.verified_at, verified_by=excluded.verified_by`
      ).bind(p.supplier, JSON.stringify(p.rules), p.source || null, p.verified_at || null, p.verified_by || null).run();
      n++;
    }
    return Response.json({ ok: true, imported: n });
  }
  if (path === "/api/shipping/quote" && method === "GET") {
    const q = {
      supplierCode: url.searchParams.get("supplier"),
      category: url.searchParams.get("category") || "UNKNOWN",
      subtotal: url.searchParams.get("subtotal") != null ? parseFloat(url.searchParams.get("subtotal")) : null,
      freeShip: url.searchParams.get("free_ship") === "true",
      bulky: url.searchParams.get("bulky") === "true"
    };
    if (!q.supplierCode) return Response.json({ error: "supplier_required" }, { status: 400 });
    const res = await quoteShipping(db, q);
    return Response.json(res);
  }
  if (path === "/api/recovery/state-import" && method === "POST") {
    const body = await request.json();
    const items = Array.isArray(body.rows) ? body.rows : [];
    if (!items.length) return Response.json({ error: "rows_required" }, { status: 400 });
    const INS = `INSERT OR REPLACE INTO variant_state
      (vid,pid,title,vtitle,sku,size,color,price,image,status,tier,conf,match_method,match_reason,
       supplier,supplier_sku,supplier_price,live_stock,last_seen,ship_status,ship_cost,
       sell_a,net_a,margin_a,sell_b,net_b,margin_b,b_unlocks,proposed_sku,proposed_conf,reasons,updated_at,live_src)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    let n = 0;
    for (let i = 0; i < items.length; i += 20) {
      const ch = items.slice(i, i + 20);
      await db.batch(ch.map((d) => db.prepare(INS).bind(
        String(d.vid || ""),
        String(d.pid || ""),
        d.title || null,
        d.vtitle || null,
        d.sku || null,
        d.size || null,
        d.color || null,
        d.price || 0,
        d.image || null,
        d.status || "",
        d.tier || "",
        d.conf ?? null,
        d.match_method || null,
        d.match_reason || null,
        d.supplier || null,
        d.supplier_sku || null,
        d.supplier_price ?? null,
        d.live_stock || null,
        d.last_seen || null,
        d.ship_status || "UNKNOWN",
        d.ship_cost ?? null,
        d.sell_a ?? null,
        d.net_a ?? null,
        d.margin_a ?? null,
        d.sell_b ?? null,
        d.net_b ?? null,
        d.margin_b ?? null,
        d.b_unlocks ? 1 : 0,
        d.proposed_sku || null,
        d.proposed_conf ?? null,
        d.reasons || "",
        d.updated_at || null,
        "v3"
      )));
      n += ch.length;
    }
    return Response.json({ ok: true, imported: n });
  }
  if (path === "/api/recovery/state" && method === "GET") {
    const tab = url.searchParams.get("tab") || "auto_ready";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10) || 0;
    const q = (url.searchParams.get("q") || "").replace(/[^\u05D0-\u05FFa-zA-Z0-9 -]/g, "");
    const TABS = {
      auto_ready: { w: "status='AUTO_READY'", ord: "net_a DESC" },
      high_confidence: { w: "tier='HIGH_CONFIDENCE' AND supplier IS NOT NULL", ord: "conf DESC, net_b DESC" },
      sku_fix: { w: "proposed_sku IS NOT NULL", ord: "proposed_conf DESC" },
      manual_review: { w: "tier='MANUAL_REVIEW' AND supplier IS NOT NULL", ord: "conf DESC" },
      no_supplier: { w: "supplier IS NULL", ord: "price DESC" },
      stock_blocked: { w: "status='NEEDS_STOCK'", ord: "conf DESC" },
      profit_blocked: { w: "status='PROFIT_BLOCKED'", ord: "supplier_price DESC" },
      shipping_blocked: { w: "status='NEEDS_SHIPPING'", ord: "conf DESC" }
    };
    const t = TABS[tab] || TABS.auto_ready;
    const qf = q ? ` AND (title LIKE '%${q}%' OR sku LIKE '%${q}%' OR supplier_sku LIKE '%${q}%')` : "";
    const rows = await db.prepare(
      `SELECT * FROM variant_state WHERE ${t.w}${qf} ORDER BY ${t.ord} LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    const tot = await db.prepare(
      `SELECT COUNT(*) n FROM variant_state WHERE ${t.w}`
    ).first();
    return Response.json({ rows: rows.results, total: tot.n, tab });
  }
  if (path === "/api/recovery/state/lookup" && method === "GET") {
    const vid = url.searchParams.get("vid") || "";
    if (!vid) return Response.json({ error: "vid_required" }, { status: 400 });
    const d = await db.prepare(
      `SELECT id, confidence, supplier_code FROM discovery_candidates
       WHERE shopify_variant_id = ? AND status='NEW' ORDER BY confidence DESC LIMIT 1`
    ).bind(vid).first();
    return Response.json({ id: d ? d.id : null, confidence: d ? d.confidence : null, supplier: d ? d.supplier_code : null });
  }
  if (path === "/api/recovery/state/summary" && method === "GET") {
    const byStatus = await db.prepare("SELECT status, COUNT(*) n FROM variant_state GROUP BY status").all();
    const byTier = await db.prepare("SELECT tier, COUNT(*) n FROM variant_state GROUP BY tier").all();
    const skuFix = await db.prepare("SELECT COUNT(*) n FROM variant_state WHERE proposed_sku IS NOT NULL").first();
    const tot = await db.prepare("SELECT COUNT(*) n FROM variant_state").first();
    return Response.json({ total: tot.n, by_status: byStatus.results, by_tier: byTier.results, sku_fix: skuFix.n });
  }
  return Response.json({ error: "not_found", path }, { status: 404 });
}
__name(handleRecoveryApi, "handleRecoveryApi");
async function createMapping(db, d, supplierId) {
  const dup = await db.prepare(
    "SELECT id FROM product_mappings WHERE shopify_variant_id = ? AND supplier_id = ? AND supplier_variant_id = ?"
  ).bind(d.shopify_variant_id, supplierId, d.supplier_variant_id).first();
  if (dup) return false;
  await db.prepare(
    `INSERT INTO product_mappings
     (shopify_product_id, shopify_variant_id, supplier_id, supplier_product_id, supplier_variant_id,
      supplier_sku, size, color, mapping_confidence, verified_at, verified_by, status)
     VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),?,'MANUAL_VERIFIED')`
  ).bind(
    d.shopify_product_id,
    d.shopify_variant_id,
    supplierId,
    d.supplier_product_id,
    d.supplier_variant_id,
    d.supplier_sku,
    d.our_size,
    d.our_color,
    d.confidence || null,
    "owner-manual"
  ).run();
  await AUDIT(
    db,
    "DISCOVERY_MAPPING_CREATED",
    "product_mapping",
    d.shopify_variant_id,
    { supplier: d.supplier_code, sku: d.supplier_sku, conf: d.confidence, from_discovery: d.id }
  );
  return true;
}
__name(createMapping, "createMapping");

// src/admin/orders_page.js
var ORDERS_PAGE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sportpro - \u05E8\u05DB\u05E9 \u05D5\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--line:#e3e6ea;--txt:#1a2233;--mut:#6b7686;--ok:#0c7a43;--bad:#b3261e;--acc:#0b57d0}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--txt)}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
h1{font-size:16px;margin:0 12px 0 0}
.tbtn{padding:7px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:pointer;font:inherit}
.tbtn.pri{background:var(--acc);color:#fff;border-color:var(--acc)}
.tbtn.on{background:var(--bad);color:#fff;border-color:var(--bad)}
#tok{width:260px;padding:7px;border:1px solid var(--line);border-radius:8px}
main{padding:14px 16px 80px}
h2{font-size:14px;margin:14px 0 6px}
#sys{padding:8px 14px;border-radius:10px;font-weight:700;display:inline-block;margin-bottom:6px}
#sys.run{background:#e6f4ea;color:var(--ok)} #sys.kill{background:#fdecea;color:var(--bad)}
.tblwrap{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;max-height:46vh;margin-bottom:14px}
table{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}
th{position:sticky;top:0;background:#eef1f5;text-align:right;padding:7px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-bottom:1px solid #eef1f5;max-width:230px;overflow:hidden;text-overflow:ellipsis}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px}
.pill.ok{background:#e6f4ea;color:var(--ok)} .pill.bad{background:#fdecea;color:var(--bad)} .pill.w{background:#fef7e0;color:#8a6d00}
.test{background:#efe; font-weight:700;padding:0 5px;border-radius:5px;font-size:10px}
#modal{position:fixed;inset:0;background:rgba(15,20,30,.45);display:none;align-items:center;justify-content:center;padding:14px;z-index:9}
#modal.on{display:flex} #box{background:var(--card);border-radius:14px;max-width:720px;width:100%;max-height:92vh;overflow:auto;padding:18px}
.kv{display:grid;grid-template-columns:150px 1fr;gap:4px 8px;font-size:13px;margin:8px 0}
.kv i{color:var(--mut);font-style:normal}.kv b{font-weight:600;overflow-wrap:anywhere}
.acts{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.note{font-size:12px;color:var(--mut);margin-top:8px}
input.proof{padding:7px;border:1px solid var(--line);border-radius:8px;width:46%;margin:4px 0}
#msg{font-size:12px;color:var(--mut)}
</style></head>
<body>
<header><h1>\u05E8\u05DB\u05E9 \u05D5\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD - Sportpro</h1>
<input id="tok" type="password" placeholder="Admin token">
<button class="tbtn pri" onclick="saveTok()">\u05D4\u05EA\u05D7\u05D1\u05E8</button>
<button class="tbtn" onclick="loadAll()">\u05E8\u05E2\u05E0\u05DF</button>
<span id="msg"></span></header>
<main>
<span id="sys">\u2026</span>
<button class="tbtn" onclick="toggleKill()">\u05D4\u05D7\u05DC\u05E3 Kill Switch</button>
<h2>\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E8\u05DB\u05E9 (Approval #1)</h2>
<div class="tblwrap"><table id="queue"></table></div>
<h2>\u05E2\u05D2\u05DC\u05D5\u05EA \u05E1\u05E4\u05E7 (Checkout / Approval #2)</h2>
<div class="tblwrap"><table id="active"></table></div>
<h2>\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA</h2>
<div class="tblwrap"><table id="orders"></table></div>
<div class="note">\u05D6\u05E8\u05D9\u05DE\u05D4: Approval #1 (\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D6\u05DE\u05E0\u05D4) \u2192 \u05D4\u05DB\u05E0\u05EA \u05E2\u05D2\u05DC\u05D4 \u2192 Approval #2 (\u05EA\u05E9\u05DC\u05D5\u05DD \u05E1\u05E4\u05E7) \u2192 Open Checkout \u2192 Mark Purchased (\u05D7\u05D9\u05D9\u05D1 \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E1\u05E4\u05E7 + \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E2\u05E1\u05E7\u05D4). \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA TEST \u05DE\u05E1\u05D5\u05DE\u05E0\u05D5\u05EA \u05D5\u05DE\u05E9\u05EA\u05DE\u05E9\u05D5\u05EA \u05D1-Test Customer \u05D1\u05DC\u05D1\u05D3. Kill Switch \u05E4\u05E2\u05D9\u05DC = \u05D0\u05D9\u05DF \u05E8\u05DB\u05E9, \u05D0\u05D9\u05DF checkout, \u05D0\u05D9\u05DF \u05E8\u05DB\u05D9\u05E9\u05D4.</div>
</main>
<div id="modal" onclick="if(event.target===this)closeM()"><div id="box"></div></div>
<script>
var cur={};
function tok(){return localStorage.getItem('ot')||''}
function saveTok(){localStorage.setItem('ot',document.getElementById('tok').value);loadAll()}
function api(p,o){return fetch(p,Object.assign({headers:{Authorization:'Bearer '+tok(),'Content-Type':'application/json'}},o||{})).then(function(r){return r.json().then(function(j){if(!r.ok)throw j;return j})})}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function msg(t){document.getElementById('msg').textContent=t||''}
function closeM(){document.getElementById('modal').className=''}
function fmt(n){return n==null?'':(Math.round(n*100)/100)}
function pill(s,t){var c=s==='PURCHASED'||s==='SHIPPED'||s==='COMPLETED'||s==='DELIVERED'?'ok':(s==='BLOCKED'||s==='REJECTED'||s==='CANCELLED'?'bad':'w');return '<span class="pill '+c+'">'+esc(s||t||'')+'</span>'}

function loadAll(){
 if(!tok()){msg('\u05D4\u05D6\u05DF token');return}
 api('/api/kill-switch').then(function(k){
   var el=document.getElementById('sys');
   el.className=k.kill_switch_active?'kill':'run';
   el.textContent=k.kill_switch_active?'\u{1F534} KILL SWITCH \u05E4\u05E2\u05D9\u05DC':'\u{1F7E2} SYSTEM RUNNING';
 }).catch(function(){});
 api('/api/procurement/queue').then(function(rows){renderQueue(rows)}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 api('/api/orders').then(function(rows){renderOrders(rows)}).catch(function(){});
 loadActive();
}
function loadActive(){
 api('/api/orders').then(function(rows){
   var ids=(rows||[]).map(function(r){return r.id});
   if(!ids.length){document.getElementById('active').innerHTML='';return}
   Promise.all(ids.map(function(id){return api('/api/orders/'+id)})).then(function(full){
     var h='<tr><th>\u05E1\u05E4\u05E7</th><th>\u05E2\u05D2\u05DC\u05D4</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E1\u05E4\u05E7</th><th>\u05E1\u05D4"\u05DB \u05E1\u05E4\u05E7</th><th>\u05E8\u05D5\u05D5\u05D7 \u05E6\u05E4\u05D5\u05D9</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr>';
     full.forEach(function(f){
       (f.supplier_orders||[]).forEach(function(so){
         if(['PENDING','READY_FOR_APPROVAL_1'].includes(so.status))return;
         if(so.status==='PURCHASED'||so.status==='COMPLETED'||so.status==='SHIPPED')return;
         var isT=so.is_test||f.order.is_test;
         h+='<tr><td>'+(isT?'<span class="test">TEST</span> ':'')+esc(so.id)+'</td><td>'+esc(f.order.order_number)+'</td><td>'+pill(so.status)+'</td><td>'+fmt(so.supplier_total)+' \u20AA</td><td>'+fmt(so.expected_net_profit)+' \u20AA</td>'+
           '<td><button class="tbtn" onclick="openSO('+so.id+')">\u05E0\u05D4\u05DC</button></td></tr>';
       });
     });
     document.getElementById('active').innerHTML=h;
   });
 }).catch(function(){});
}
function renderQueue(rows){
 var h='<tr><th>\u05E2\u05D2\u05DC\u05D4</th><th>TEST</th><th>\u05E1\u05E4\u05E7</th><th>\u05DC\u05E7\u05D5\u05D7</th><th>\u05DE\u05D5\u05E6\u05E8\u05D9\u05DD</th><th>\u05E2\u05DC\u05D5\u05EA \u05E1\u05E4\u05E7</th><th>\u05DE\u05E9\u05DC\u05D5\u05D7</th><th>\u05E1\u05D4"\u05DB \u05E1\u05E4\u05E7</th><th>\u05DE\u05DB\u05D9\u05E8\u05D4</th><th>\u05E8\u05D5\u05D5\u05D7 \u05E6\u05E4\u05D5\u05D9</th><th>\u05DE\u05E8\u05D5\u05D5\u05D7</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr>';
 (rows||[]).forEach(function(so){
   var items=JSON.parse(so.items||'[]');
   h+='<tr><td>'+esc(so.order_number)+'</td><td>'+(so.is_test?'<span class="test">TEST</span>':'')+'</td><td>'+esc(so.supplier_name)+'</td><td>'+esc(so.customer_name)+'</td><td>'+esc(items.map(function(i){return i.title+' \xD7'+i.quantity}).join(', '))+'</td>'+
    '<td>'+fmt(so.supplier_subtotal)+'</td><td>'+fmt(so.supplier_shipping)+'</td><td>'+fmt(so.supplier_total)+'</td><td>'+fmt(so.customer_revenue)+'</td><td>'+fmt(so.expected_net_profit)+'</td><td>'+fmt(so.expected_net_margin)+'%</td>'+
    '<td><button class="tbtn" onclick="openSO('+so.id+')">\u05E4\u05E8\u05D8\u05D9\u05DD</button></td></tr>';
 });
 document.getElementById('queue').innerHTML=h;
 msg((rows||[]).length+' \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8');
}
function renderOrders(rows){
 var h='<tr><th>#</th><th>\u05E2\u05D2\u05DC\u05D4</th><th>TEST</th><th>\u05DC\u05E7\u05D5\u05D7</th><th>\u05E1\u05DB\u05D5\u05DD</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05D7\u05E1\u05D9\u05DE\u05D4</th><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th></tr>';
 (rows||[]).forEach(function(o){
  h+='<tr><td>'+o.id+'</td><td>'+esc(o.order_number)+'</td><td>'+(o.order_number&&o.order_number.indexOf('TEST-')===0?'<span class="test">TEST</span>':'')+'</td><td>'+esc(o.customer_name)+'</td><td>'+fmt(o.total_price)+'</td><td>'+pill(o.status)+'</td><td>'+esc(o.blocked_reason||'')+'</td><td>'+esc(o.created_at)+'</td></tr>';
 });
 document.getElementById('orders').innerHTML=h;
}
function openSO(id){
 api('/api/supplier-orders/'+id).then(function(f){
  cur=f;var so=f.supplier_order;var items=JSON.parse(so.items||'[]');
  var h='<h2>\u05E2\u05D2\u05DC\u05EA \u05E1\u05E4\u05E7 #'+so.id+' '+(so.is_test?'<span class="test">TEST ORDER</span>':'')+'</h2>';
  h+='<div class="kv"><i>\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E1\u05E4\u05E7</i><b>'+esc(so.status)+'</b><i>\u05E1\u05D8\u05D8\u05D5\u05E1 \u05D4\u05D6\u05DE\u05E0\u05D4</i><b>'+esc(f.order.order_status||'')+'</b></div>';
  items.forEach(function(it){
   h+='<div class="kv"><i>\u05DE\u05D5\u05E6\u05E8</i><b>'+esc(it.title)+'</b><i>\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8</i><b>'+esc(it.supplier_variant_id||'')+'</b><i>\u05DB\u05DE\u05D5\u05EA</i><b>'+it.quantity+'</b><i>SKU</i><b>'+esc(it.sku||'')+'</b><i>\u05DE\u05D7\u05D9\u05E8 \u05E1\u05E4\u05E7 (\u05D9\u05D7')</i><b>'+fmt(it.supplier_cost)+' \u20AA</b></div>';
  });
  h+='<div class="kv"><i>\u05E1\u05E4\u05E7</i><b>'+esc(f.supplier_order.supplier_name)+'</b><i>\u05DE\u05E9\u05DC\u05D5\u05D7</i><b>'+fmt(so.supplier_shipping)+' \u20AA</b><i>TOTAL \u05E1\u05E4\u05E7</i><b>'+fmt(so.supplier_total)+' \u20AA</b><i>\u05DE\u05D7\u05D9\u05E8 \u05DE\u05DB\u05D9\u05E8\u05D4</i><b>'+fmt(so.customer_revenue)+' \u20AA</b><i>\u05E8\u05D5\u05D5\u05D7 \u05E6\u05E4\u05D5\u05D9</i><b>'+fmt(so.expected_net_profit)+' \u20AA</b><i>\u05DE\u05E8\u05D5\u05D5\u05D7</i><b>'+fmt(so.expected_net_margin)+'%</b></div>';
  var st=so.status;
  if(st==='PENDING'||st==='READY_FOR_APPROVAL_1'){
   h+='<div class="acts"><button class="tbtn pri" onclick="approve('+id+',1)">APPROVE PROCUREMENT</button><button class="tbtn" onclick="rejectSO('+id+')">REJECT</button></div>';
  } else if(st==='APPROVED'){
   h+='<div class="acts"><button class="tbtn pri" onclick="draft('+id+')">\u05D4\u05DB\u05DF \u05E2\u05D2\u05DC\u05EA \u05E1\u05E4\u05E7 (Draft)</button><button class="tbtn" onclick="rejectSO('+id+')">REJECT</button></div>';
  } else if(st==='CHECKOUT_READY'){
   h+='<div class="acts"><button class="tbtn pri" onclick="approve('+id+',2)">APPROVE PAYMENT (#2)</button><button class="tbtn" onclick="cancelSO('+id+')">CANCEL</button></div>';
   h+='<div class="note">\u05D8\u05D9\u05D5\u05D8\u05EA \u05E2\u05D2\u05DC\u05D4 \u05E0\u05D5\u05E6\u05E8\u05D4 \u05D5\u05EA\u05E7\u05E4\u05D4 \u05E2\u05D3 '+esc(so.checkout_expires_at||'')+' (Test Customer \u05D1\u05DC\u05D1\u05D3 \u05E2\u05D1\u05D5\u05E8 TEST).</div>';
  } else if(st==='PAYMENT_PENDING_SUPPLIER'){
   h+='<div class="acts"><button class="tbtn pri" onclick="openWin('+id+')">OPEN CHECKOUT</button><button class="tbtn" onclick="cancelSO('+id+')">CANCEL</button></div>';
   h+='<h2>Mark Purchased \u2014 \u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05E9\u05E0\u05D9 \u05D4\u05D5\u05DB\u05D7\u05D5\u05EA</h2>'+
      '<div><input class="proof" id="sonum" placeholder="\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E1\u05E4\u05E7 (\u05D7\u05D5\u05D1\u05D4)"><input class="proof" id="conf" placeholder="\u05D0\u05D9\u05E9\u05D5\u05E8 \u05E2\u05E1\u05E7\u05D4 (\u05D7\u05D5\u05D1\u05D4)"></div>'+
      '<div class="acts"><button class="tbtn pri" onclick="markPurchased('+id+')">MARK PURCHASED</button></div>';
  } else if(st==='PURCHASED'||st==='SHIPPED'||st==='COMPLETED'){
   h+='<div class="note">\u05E8\u05DB\u05E9 \u05D4\u05D5\u05E9\u05DC\u05DD. \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E1\u05E4\u05E7: '+esc(f.purchase? f.purchase.supplier_order_number:'')+' | Tracking: '+esc(f.tracking?f.tracking.tracking_number:'\u05DE\u05DE\u05EA\u05D9\u05DF')+'</div>';
  }
  h+='<div class="acts"><button class="tbtn" onclick="closeM()">\u05E1\u05D2\u05D5\u05E8</button></div>';
  document.getElementById('box').innerHTML=h;
  document.getElementById('modal').className='on';
 }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function approve(id,stage){
 api('/api/approvals',{method:'POST',body:JSON.stringify({supplier_order_id:id,stage:stage,decision:'APPROVED',approved_by:'owner'})})
 .then(function(r){msg(stage===1?'\u05D0\u05D5\u05E9\u05E8 \u05E9\u05DC\u05D1 1':'\u05D0\u05D5\u05E9\u05E8 \u05E9\u05DC\u05D1 2 (\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD)');closeM();loadAll()})
 .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function rejectSO(id){
 api('/api/approvals',{method:'POST',body:JSON.stringify({supplier_order_id:id,stage:1,decision:'REJECTED',approved_by:'owner'})})
 .then(function(){msg('\u05E0\u05D3\u05D7\u05D4');closeM();loadAll()}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function draft(id){
 api('/api/supplier-orders/'+id+'/checkout-draft',{method:'POST',body:'{}'})
 .then(function(r){msg('\u05D8\u05D9\u05D5\u05D8\u05D4 \u05E0\u05D5\u05E6\u05E8\u05D4 (Test Customer: '+r.test_customer_used+')');closeM();loadAll()})
 .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function cancelSO(id){
 api('/api/supplier-orders/'+id+'/cancel',{method:'POST',body:'{}'})
 .then(function(){msg('\u05D1\u05D5\u05D8\u05DC');closeM();loadAll()}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function openWin(id){
 api('/api/supplier-orders/'+id).then(function(f){
  var u=f.supplier_order.checkout_url;
  if(u){window.open(u,'_blank')}else{msg('\u05D0\u05D9\u05DF checkout_url')}
 }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function markPurchased(id){
 var n=document.getElementById('sonum').value.trim(),c=document.getElementById('conf').value.trim();
 if(!n||!c){msg('\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05D2\u05DD \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05DE\u05E0\u05EA \u05E1\u05E4\u05E7 \u05D5\u05D2\u05DD \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E2\u05E1\u05E7\u05D4');return}
 api('/api/supplier-orders/'+id+'/purchase',{method:'POST',body:JSON.stringify({supplier_order_number:n,transaction_confirmation:c})})
 .then(function(r){msg('\u05E0\u05E8\u05DB\u05E9 \u2713 (\u05D4\u05D5\u05DB\u05D7\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5)');closeM();loadAll()})
 .catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function toggleKill(){
 if(!confirm('\u05DC\u05D4\u05D7\u05DC\u05D9\u05E3 \u05D0\u05EA \u05DE\u05E6\u05D1 \u05D4-Kill Switch?'))return;
 api('/api/kill-switch').then(function(k){
  return api('/api/kill-switch',{method:'POST',body:JSON.stringify({active:!k.kill_switch_active,by:'owner'})});
 }).then(function(){loadAll()}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
document.getElementById('tok').value=tok();if(tok())loadAll();
<\/script></body></html>`;

// src/admin/admin_page.js
var ADMIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sportpro - Admin</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--line:#e3e6ea;--txt:#1a2233;--mut:#6b7686;--ok:#0c7a43;--bad:#b3261e;--acc:#0b57d0}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--txt)}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
h1{font-size:16px;margin:0 10px 0 0}
nav{display:flex;gap:6px;flex-wrap:wrap}
nav button{padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:pointer;font:inherit}
nav button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
#tok{width:220px;padding:7px;border:1px solid var(--line);border-radius:8px}
.tbtn{padding:7px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:pointer;font:inherit}
.tbtn.pri{background:var(--acc);color:#fff;border-color:var(--acc)}
main{padding:14px 16px 80px}
.tiles{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.tile{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 14px;text-align:center;min-width:96px}
.tile b{display:block;font-size:18px}.tile span{font-size:11px;color:var(--mut)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0}
table{border-collapse:collapse;width:100%;font-size:12px}
th{background:#eef1f5;text-align:right;padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:5px 8px;border-bottom:1px solid #eef1f5;overflow-wrap:anywhere}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;background:#eef1f5}
.sev-warning{background:#fef7e0}.sev-critical{background:#fdecea;color:var(--bad)}
#msg{font-size:12px;color:var(--mut)}
pre{background:#f2f4f8;padding:10px;border-radius:8px;font-size:11px;overflow:auto}
#sys{padding:6px 14px;border-radius:10px;font-weight:700;display:inline-block;margin:6px 0}
#sys.run{background:#e6f4ea;color:var(--ok)} #sys.kill{background:#fdecea;color:var(--bad)}
</style></head>
<body>
<header><h1>Sportpro Admin</h1>
<nav id="nav"></nav>
<input id="tok" type="password" placeholder="Token">
<button class="tbtn pri" onclick="saveTok()">\u05D4\u05EA\u05D7\u05D1\u05E8</button>
<span id="msg"></span></header>
<main id="view"></main>
<script>
var SECTIONS=[['dash','Dashboard'],['orders','Orders'],['mappings','Mappings'],['products','Products'],['suppliers','Suppliers'],['pricing','Pricing'],['alerts','Alerts'],['settings','Settings'],['audit','Audit Log']];
function tok(){return localStorage.getItem('at')||''}
function saveTok(){localStorage.setItem('at',document.getElementById('tok').value);go('dash')}
function api(p,o){return fetch(p,Object.assign({headers:{Authorization:'Bearer '+tok(),'Content-Type':'application/json'}},o||{})).then(function(r){return r.json().then(function(j){if(!r.ok)throw j;return j})})}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function msg(t){document.getElementById('msg').textContent=t||''}
function fmt(n){return n==null?'-':(Math.round(n*100)/100)}
document.getElementById('tok').value=tok();
(function(){var h='';SECTIONS.forEach(function(s){h+='<button onclick="go(\\''+s[0]+'\\')">'+s[1]+'</button>'});document.getElementById('nav').innerHTML=h})();

function go(sec){
 if(!tok()){msg('\u05D4\u05D6\u05DF token');return}
 var v=document.getElementById('view');msg('');
 var btns=document.getElementById('nav').children;
 for(var i=0;i<btns.length;i++){btns[i].className=(SECTIONS[i][0]===sec)?'on':''}
 if(sec==='dash'){
  Promise.all([api('/api/dashboard'),api('/api/verify/summary')]).then(function(a){
   var d=a[0],m=a[1],k=d.kpi||{};
   v.innerHTML='<span id="sys" class="'+(k.kill_switch_active?'kill':'run')+'">'+(k.kill_switch_active?'\u{1F534} KILL SWITCH \u05E4\u05E2\u05D9\u05DC':'\u{1F7E2} RUNNING')+'</span>'+
   '<div class="tiles">'+
   t(k.orders_today!=null?k.orders_today:(d.today?d.today.orders:0),'Orders Today')+
   t(k.awaiting_approval,'Awaiting Approval')+t(k.purchases,'Purchases')+
   t(k.in_fulfillment,'In Fulfillment')+t(k.blocked,'Blocked')+
   t(fmt(k.revenue)+' \u20AA','Revenue')+t(fmt(k.expected_profit_pending)+' \u20AA','Expected Profit')+
   t(fmt(k.actual_profit_purchased)+' \u20AA','Actual Profit')+t(fmt(k.supplier_spend_purchased)+' \u20AA','Supplier Spend')+
   t(k.test_orders,'TEST Orders')+
   '</div><div class="tiles">'+t(m.candidates,'Candidates')+t(m.manual_verified,'Manual Verified')+
   t(m.live_checked,'Live Checked')+t(m.supplier_ready_true,'Supplier Ready')+'</div>'+
   '<div class="note" style="font-size:12px;color:var(--mut)">\u05D4\u05D6\u05DE\u05E0\u05D5\u05EA TEST \u05DE\u05D5\u05E4\u05E8\u05D3\u05D5\u05EA. \u05E8\u05D5\u05D5\u05D7 \u05D1\u05E4\u05D5\u05E2\u05DC \u05DE\u05D7\u05D5\u05E9\u05D1 \u05E8\u05E7 \u05DE\u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05E9\u05D4\u05D5\u05E9\u05DC\u05DE\u05D5.</div>';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 } else if(sec==='orders'){ location.href='/orders'; return;
 } else if(sec==='mappings'){ location.href='/verify'; return;
 } else if(sec==='products'){
  api('/api/eligibility').then(function(r){
   var h='<div class="card"><b>Product Eligibility (Phase 12)</b><br><br><button class="tbtn pri" onclick="runElig()">\u05D4\u05E8\u05E5 \u05D7\u05D9\u05E9\u05D5\u05D1 \u05D6\u05DB\u05D0\u05D5\u05EA</button></div>';
   h+='<div class="card"><table><tr><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05DE\u05E1\u05E4\u05E8</th></tr>';
   (r.summary||[]).forEach(function(x){h+='<tr><td>'+esc(x.eligibility_status)+'</td><td>'+x.n+'</td></tr>'});
   h+='</table><h3>\u05E1\u05D9\u05D1\u05D5\u05EA \u05D7\u05E1\u05D9\u05DE\u05D4</h3><table><tr><th>\u05E1\u05D9\u05D1\u05D4</th><th>\u05DE\u05E1\u05E4\u05E8</th></tr>';
   (r.blocked_reasons||[]).forEach(function(x){h+='<tr><td>'+esc(x.eligibility_blocked_reason)+'</td><td>'+x.n+'</td></tr>'});
   v.innerHTML=h+'</div>';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 } else if(sec==='suppliers'){
  api('/api/suppliers').then(function(rows){
   var h='<div class="card"><table><tr><th>\u05E1\u05E4\u05E7</th><th>\u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>Paused</th><th>Reliability</th></tr>';
   rows.forEach(function(s){h+='<tr><td>'+esc(s.name)+'</td><td>'+esc(s.platform)+'</td><td>'+esc(s.status)+'</td><td>'+(s.paused?'\u{1F534}':'\u{1F7E2}')+'</td><td>'+s.reliability_score+'</td></tr>'});
   v.innerHTML=h+'</table></div>';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 } else if(sec==='pricing'){
  v.innerHTML='<div class="card"><b>Pricing Recalc (Phase 11) \u2014 DRY RUN \u05D1\u05DC\u05D1\u05D3, \u05DC\u05D0 \u05E0\u05D5\u05D2\u05E2 \u05D1-Shopify Production</b><br><br><button class="tbtn pri" onclick="runRecalc()">\u05D4\u05E8\u05E5 DRY RUN</button><div id="rep"></div></div>';
 } else if(sec==='alerts'){
  api('/api/alerts').then(function(rows){
   var h='<div class="card"><table><tr><th>\u05D0\u05D9\u05E8\u05D5\u05E2</th><th>\u05D7\u05D5\u05DE\u05E8\u05D4</th><th>\u05DB\u05D5\u05EA\u05E8\u05EA</th><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th></th></tr>';
   rows.forEach(function(a){h+='<tr><td>'+esc(a.event_type)+'</td><td><span class="pill sev-'+esc(a.severity)+'">'+esc(a.severity)+'</span></td><td>'+esc(a.title)+'</td><td>'+esc(a.created_at)+'</td><td>'+(a.read?'':'<button class="tbtn" onclick="readAlert('+a.id+')">\u05E1\u05DE\u05DF \u05DB\u05E0\u05E7\u05E8\u05D0</button>')+'</td></tr>'});
   v.innerHTML=h+'</table></div>';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 } else if(sec==='settings'){
  v.innerHTML='<div class="card"><b>SYSTEM STATUS</b><br><span id="sys2">\u2026</span><br><br><button class="tbtn" onclick="toggleKill2()">\u05D4\u05D7\u05DC\u05E3 Kill Switch</button><div class="note">Kill Switch \u05E4\u05E2\u05D9\u05DC: \u05DC\u05D0 \u05E0\u05D5\u05E6\u05E8 \u05E8\u05DB\u05E9, \u05DC\u05D0 \u05E0\u05D5\u05E6\u05E8 checkout, \u05DC\u05D0 \u05DE\u05EA\u05D1\u05E6\u05E2\u05EA \u05E8\u05DB\u05D9\u05E9\u05D4. \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5\u05EA \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC.</div></div>'+
  '<div class="card"><b>\u05E2\u05E8\u05D5\u05E6\u05D9 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA (Phase 14)</b><div class="note">Dashboard \u2713 \u05E4\u05E2\u05D9\u05DC. Email / Telegram / WhatsApp \u2014 \u05DE\u05D5\u05DB\u05E0\u05D9\u05DD \u05D1\u05D0\u05E8\u05DB\u05D9\u05D8\u05E7\u05D8\u05D5\u05E8\u05D4, \u05DC\u05D0 \u05DE\u05D5\u05E4\u05E2\u05DC\u05D9\u05DD \u05D1-STAGING.</div></div>';
  api('/api/kill-switch').then(function(k){var e=document.getElementById('sys2');e.className=k.kill_switch_active?'kill':'run';e.textContent=k.kill_switch_active?'\u{1F534} KILL SWITCH \u05E4\u05E2\u05D9\u05DC':'\u{1F7E2} RUNNING'});
 } else if(sec==='audit'){
  api('/api/audit?limit=200').then(function(rows){
   var h='<div class="card"><table><tr><th>#</th><th>actor</th><th>action</th><th>entity</th><th>\u05E4\u05D9\u05E8\u05D5\u05D8</th><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th></tr>';
   rows.forEach(function(a){h+='<tr><td>'+a.id+'</td><td>'+esc(a.actor)+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.entity_type)+':'+esc(a.entity_id)+'</td><td style="max-width:260px">'+esc(a.details)+'</td><td>'+esc(a.created_at)+'</td></tr>'});
   v.innerHTML=h+'</table></div>';
  }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
 }
}
function t(v,l){return '<div class="tile"><b>'+esc(v)+'</b><span>'+l+'</span></div>'}
function runRecalc(){
 msg('\u05DE\u05E8\u05D9\u05E5 DRY RUN\u2026');
 api('/api/pricing/recalc',{method:'POST',body:JSON.stringify({dry_run:true})}).then(function(r){
  document.getElementById('rep').innerHTML='<pre>'+esc(JSON.stringify(r.report,null,1))+'</pre>';msg('\u05D4\u05D5\u05E9\u05DC\u05DD');
 }).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function runElig(){
 msg('\u05DE\u05D7\u05E9\u05D1 \u05D6\u05DB\u05D0\u05D5\u05EA\u2026');
 api('/api/eligibility/run',{method:'POST',body:'{}'}).then(function(r){go('products');msg('\u05D6\u05DB\u05D0\u05D5\u05EA \u05D7\u05D5\u05E9\u05D1\u05D4 \u05D5\u05E0\u05E9\u05DE\u05E8\u05D4 ('+r.persisted_eligibility+' \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD)')}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
function readAlert(id){api('/api/alerts/'+id+'/read',{method:'POST',body:'{}'}).then(function(){go('alerts')})}
function toggleKill2(){
 api('/api/kill-switch').then(function(k){
  return api('/api/kill-switch',{method:'POST',body:JSON.stringify({active:!k.kill_switch_active,by:'owner'})});
 }).then(function(){go('settings')}).catch(function(e){msg('\u05E9\u05D2\u05D9\u05D0\u05D4: '+(e&&e.error||''))});
}
if(tok())go('dash');
<\/script></body></html>`;

// src/admin/dq_page.js
var DQ_PAGE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sportpro - Data Quality (READ ONLY)</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--line:#e3e6ea;--txt:#1a2233;--mut:#6b7686;--ok:#0c7a43;--bad:#b3261e;--acc:#0b57d0;--warn:#8a6d00}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--txt)}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
h1{font-size:16px;margin:0 12px 0 0}
.tiles{display:flex;flex-wrap:wrap;gap:8px}
.tile{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 12px;text-align:center;min-width:86px}
.tile b{display:block;font-size:18px}.tile span{font-size:11px;color:var(--mut)}
main{padding:14px 16px 80px}
.banner{background:#fff8e1;border:1px solid #f0d47a;color:var(--warn);border-radius:10px;padding:10px 14px;margin:10px 0;font-size:14px;font-weight:600}
.toolbar{display:flex;gap:8px;margin:10px 0;align-items:center;flex-wrap:wrap}
#tok{width:300px;padding:7px;border:1px solid var(--line);border-radius:8px}
button{padding:7px 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);cursor:pointer}
button.pri{background:var(--acc);color:#fff;border-color:var(--acc)}
#tblwrap{overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:10px;max-height:65vh}
table{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}
th{position:sticky;top:0;background:#eef1f5;text-align:right;padding:7px 8px;border-bottom:1px solid var(--line)}
td{padding:6px 8px;border-bottom:1px solid #eef1f5;max-width:260px;overflow:hidden;text-overflow:ellipsis}
.note{font-size:12px;color:var(--mut);margin-top:8px}
a{color:var(--acc)}
</style>
</head>
<body>
<header>
  <h1>Data Quality \u2014 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9 Shopify \u05DE\u05D5\u05E6\u05E2\u05D9\u05DD</h1>
  <div class="tiles" id="dash"></div>
</header>
<main>
  <div class="banner">\u26A0\uFE0F READ ONLY \u2014 \u05E9\u05D5\u05DD \u05E9\u05D9\u05E0\u05D5\u05D9 \u05DC\u05D0 \u05DE\u05D1\u05D5\u05E6\u05E2 \u05DB\u05D0\u05DF. \u05E9\u05D5\u05DD SKU \u05DC\u05D0 \u05E0\u05DB\u05EA\u05D1 \u05DC-Shopify, \u05E9\u05D5\u05DD \u05DE\u05D7\u05D9\u05E8/\u05E4\u05E8\u05E1\u05D5\u05DD/collection/vendor \u05DC\u05D0 \u05DE\u05E9\u05EA\u05E0\u05D4. \u05DB\u05DC \u05E4\u05E2\u05D5\u05DC\u05D4 \u05D3\u05D5\u05E8\u05E9\u05EA \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E4\u05D5\u05E8\u05E9 \u05E9\u05DC\u05DA \u05DE\u05D7\u05D5\u05E5 \u05DC\u05DE\u05E2\u05E8\u05DB\u05EA.</div>
  <div class="toolbar">
    <input id="tok" type="password" placeholder="Admin token">
    <button class="pri" onclick="saveTok()">\u05D4\u05EA\u05D7\u05D1\u05E8</button>
    <button onclick="load()">\u05E8\u05E2\u05E0\u05DF</button>
    <select id="typeSel" onchange="load()">
      <option value="sku_fix">\u05EA\u05D9\u05E7\u05D5\u05E0\u05D9 SKU \u05DE\u05D5\u05E6\u05E2\u05D9\u05DD</option>
      <option value="missing_size">\u05D7\u05E1\u05E8 \u05DE\u05D9\u05D3\u05D4</option>
      <option value="missing_color">\u05D7\u05E1\u05E8 \u05E6\u05D1\u05E2</option>
    </select>
    <span id="msg" style="font-size:12px;color:var(--mut)"></span>
  </div>
  <div id="tblwrap"><table id="tbl"></table></div>
  <div class="note">Evidence \u05DC\u05DB\u05DC \u05E9\u05D5\u05E8\u05D4: \u05E9\u05D9\u05D8\u05EA \u05D4\u05D4\u05EA\u05D0\u05DE\u05D4, \u05E1\u05D9\u05D1\u05D4, \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05D5\u05DE\u05E7\u05D5\u05E8 \u05D7\u05D9. proposed_sku \u05D0\u05E3 \u05E4\u05E2\u05DD \u05DC\u05D0 \u05E0\u05DB\u05EA\u05D1 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA.</div>
</main>
<script>
function saveTok(){localStorage.setItem('vt',document.getElementById('tok').value);load()}
function tok(){return localStorage.getItem('vt')||''}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function msg(t){document.getElementById('msg').textContent=t||''}
function api(p){return fetch(p,{headers:{Authorization:'Bearer '+tok(),'Content-Type':'application/json'}}).then(function(r){return r.json()})}
function load(){
  if(!tok()){msg('\u05D4\u05D6\u05DF token');return}
  var t=document.getElementById('typeSel').value;
  var q=t==='sku_fix'?'/api/recovery/state?tab=sku_fix&limit=500':
      t==='missing_size'?'/api/recovery/state?tab=manual_review&limit=1': // placeholder resolved below
      '/api/recovery/state?tab=manual_review&limit=1';
  Promise.all([api('/api/recovery/state/summary'),api(t==='sku_fix'?q:q)]).then(function(a){
    var s=a[0];
    var t2=function(v,lab,col){return '<div class="tile"><b style="color:'+(col||'var(--txt)')+'">'+v+'</b><span>'+lab+'</span></div>'};
    var by={};(s.by_status||[]).forEach(function(x){by[x.status]=x.n});
    document.getElementById('dash').innerHTML=
      t2(s.sku_fix,'SKU fixes \u05DE\u05D5\u05E6\u05E2\u05D9\u05DD','var(--ok)')+
      t2(by['NEEDS_DATA_FIX']||0,'\u05E0\u05D3\u05E8\u05E9 \u05EA\u05D9\u05E7\u05D5\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD')+
      t2(by['NO_SUPPLIER']||0,'\u05D1\u05DC\u05D9 \u05E1\u05E4\u05E7')+
      t2(s.total,'\u05E1\u05D4\u05DB \u05D5\u05E8\u05D9\u05D0\u05E6\u05D9\u05D5\u05EA');
    var rows=a[1].rows||[];
    if(t!=='sku_fix'){
      msg('\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D6\u05D5 \u05E0\u05EA\u05DE\u05DB\u05EA \u05DB\u05E8\u05D2\u05E2 \u05E8\u05E7 \u05DC-SKU fixes \u2014 '+rows.length+' \u05E9\u05D5\u05E8\u05D5\u05EA');
    }
    var h='<tr><th>\u05DE\u05D5\u05E6\u05E8</th><th>\u05D5\u05E8\u05D9\u05D0\u05E0\u05D8</th><th>SKU \u05E0\u05D5\u05DB\u05D7\u05D9</th><th>SKU \u05DE\u05D5\u05E6\u05E2</th><th>\u05D1\u05D9\u05D8\u05D7\u05D5\u05DF</th><th>\u05E1\u05E4\u05E7</th><th>SKU \u05E1\u05E4\u05E7</th><th>\u05E9\u05D9\u05D8\u05D4</th><th>\u05E1\u05D9\u05D1\u05D4</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th></tr>';
    rows.forEach(function(r){
      h+='<tr><td title="'+esc(r.title)+'">'+esc(r.title)+'</td><td>'+esc(r.vtitle)+'</td><td>'+esc(r.sku||'(\u05D7\u05E1\u05E8)')+
        '</td><td><b>'+esc(r.proposed_sku)+'</b></td><td>'+((r.proposed_conf||0)*100).toFixed(0)+'%</td><td>'+esc(r.supplier)+
        '</td><td>'+esc(r.supplier_sku)+'</td><td>'+esc(r.match_method)+'</td><td title="'+esc(r.match_reason)+'">'+esc((r.match_reason||'').slice(0,40))+
        '</td><td>'+esc(r.status)+'</td></tr>';
    });
    document.getElementById('tbl').innerHTML=h;
    msg(rows.length+' \u05E9\u05D5\u05E8\u05D5\u05EA (READ ONLY)');
  }).catch(function(){msg('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05D4 \u2014 \u05D8\u05D5\u05E7\u05DF \u05E9\u05D2\u05D5\u05D9?')});
}
document.getElementById('tok').value=tok();
if(tok())load();
<\/script>
</body>
</html>`;

// src/index.js
var index_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/webhooks/shopify" && request.method === "POST") {
      return handleWebhook(request, env2);
    }
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "sportpro-automation-v2" });
    }
    if (url.pathname === "/verify") {
      return new Response(VERIFY_PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/orders") {
      return new Response(ORDERS_PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return new Response(ADMIN_PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/admin/data-quality") {
      return new Response(DQ_PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname.startsWith("/api/")) {
      const auth = checkAuth(request, env2);
      if (!auth.ok) return Response.json({ error: auth.reason }, { status: 401 });
      if (url.pathname === "/api/verify-shopify") {
        return handleApi(request, env2, url);
      }
      if (url.pathname.startsWith("/api/recovery") || url.pathname.startsWith("/api/shipping") || url.pathname.startsWith("/api/verify/discovery")) {
        return handleRecoveryApi(request, env2, url);
      }
      if (url.pathname.startsWith("/api/mappings") || url.pathname.startsWith("/api/pilot") || url.pathname.startsWith("/api/catalog") || url.pathname.startsWith("/api/verify") || url.pathname.startsWith("/api/settings")) {
        return handleMappingApi(request, env2, url);
      }
      if (url.pathname.startsWith("/api/procurement") || url.pathname.startsWith("/api/supplier-orders") || url.pathname.startsWith("/api/test/") || url.pathname.startsWith("/api/alerts") || url.pathname.startsWith("/api/audit") || url.pathname.startsWith("/api/pricing") || url.pathname.startsWith("/api/eligibility")) {
        return handleOrdersApi(request, env2, url);
      }
      return handleApi(request, env2, url);
    }
    return new Response("not_found", { status: 404 });
  }
};
async function handleWebhook(request, env2) {
  const rawBody = await request.text();
  const ok = await verifyWebhookSignature(rawBody, request.headers.get("X-Shopify-Hmac-Sha256"), env2.WEBHOOK_SECRET);
  if (!ok) return new Response("invalid_signature", { status: 401 });
  const payload = JSON.parse(rawBody);
  const eventId = `${request.headers.get("X-Shopify-Webhook-Id") || ""}`;
  const dedup = await recordEvent(env2.DB, {
    shopify_webhook_id: eventId || null,
    shopify_event_id: null,
    event_type: request.headers.get("X-Shopify-Webhook-Topic") || "orders/create",
    payload_hash: null
  });
  if (!dedup.first_time) {
    return Response.json({ ok: true, skipped: dedup.reason });
  }
  const parsed = parseOrderWebhook(payload);
  if (!parsed) return Response.json({ ok: true, skipped: "not_an_order" });
  if (parsed.financial_status !== "paid" || parsed.cancelled_at) {
    return Response.json({ ok: true, skipped: "not_paid_or_cancelled" });
  }
  const result = await withProcurementLock(env2, parsed.shopify_order_id, "webhook", async () => {
    const settings = await getSettings(env2.DB);
    return ingestOrder(env2.DB, parsed, settings);
  });
  return Response.json({ ok: true, ...result });
}
__name(handleWebhook, "handleWebhook");
function checkAuth(request, env2) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !env2.ADMIN_TOKEN || token !== env2.ADMIN_TOKEN) {
    return { ok: false, reason: "unauthorized" };
  }
  return { ok: true };
}
__name(checkAuth, "checkAuth");
async function handleApi(request, env2, url) {
  const db = env2.DB;
  const path = url.pathname;
  if (path === "/api/orders" && request.method === "GET") {
    const rows = await db.prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.total_price, o.status,
              o.blocked_reason, o.created_at,
              (SELECT COUNT(*) FROM supplier_orders so WHERE so.order_id = o.id) AS supplier_order_count
       FROM orders o ORDER BY o.id DESC LIMIT 100`
    ).all();
    return Response.json(rows.results);
  }
  if (path.startsWith("/api/orders/") && request.method === "GET") {
    const id = path.split("/")[3];
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
    if (!order) return Response.json({ error: "not_found" }, { status: 404 });
    const sos = await db.prepare("SELECT * FROM supplier_orders WHERE order_id = ?").bind(id).all();
    const items = await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(id).all();
    return Response.json({ order, supplier_orders: sos.results, items: items.results });
  }
  if (path === "/api/approvals" && request.method === "POST") {
    const ksBlockApproval = await killSwitchBlock(db, "approval");
    if (ksBlockApproval) return ksBlockApproval;
    const body = await request.json();
    const { supplier_order_id, stage, decision, approved_by } = body;
    if (![1, 2].includes(stage) || !["APPROVED", "REJECTED"].includes(decision)) {
      return Response.json({ error: "bad_request:stage_or_decision" }, { status: 400 });
    }
    const so = await db.prepare("SELECT * FROM supplier_orders WHERE id = ?").bind(supplier_order_id).first();
    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const gApproval = await guardAction(db, env2, stage === 2 ? "approval_2" : "approval_1", { so });
    if (!gApproval.ok) return guardResponse(gApproval);
    const dup = await db.prepare(
      `SELECT id FROM approvals WHERE supplier_order_id = ? AND stage = ? AND decision = ?`
    ).bind(supplier_order_id, stage, decision).first();
    if (dup) return Response.json({ error: "duplicate_approval" }, { status: 409 });
    const soSt = so.status;
    if (stage === 1 && !["PENDING", "READY_FOR_APPROVAL_1"].includes(soSt)) {
      return Response.json({ error: `illegal_state:${soSt}` }, { status: 409 });
    }
    if (stage === 2 && !["APPROVED", "CHECKOUT_READY"].includes(soSt)) {
      return Response.json({ error: `illegal_state:${soSt}` }, { status: 409 });
    }
    if (stage === 2) {
      const prior = await db.prepare(
        `SELECT id FROM approvals WHERE supplier_order_id = ? AND stage = 1 AND decision = 'APPROVED'`
      ).bind(supplier_order_id).first();
      if (!prior) return Response.json({ error: "stage1_not_approved" }, { status: 409 });
      if (so.snapshot_matches === 0) {
        return Response.json({ error: "REAPPROVAL_REQUIRED:snapshot_changed" }, { status: 409 });
      }
    }
    await db.prepare(
      `INSERT INTO approvals (order_id, supplier_order_id, stage, decision, approved_by, snapshot)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      so.order_id,
      supplier_order_id,
      stage,
      decision,
      approved_by || "admin",
      JSON.stringify(body.snapshot || null)
    ).run();
    const newStatus = stage === 1 ? decision === "APPROVED" ? "APPROVED" : "BLOCKED" : decision === "APPROVED" ? "PAYMENT_PENDING_SUPPLIER" : "BLOCKED";
    await db.prepare("UPDATE supplier_orders SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(newStatus, supplier_order_id).run();
    const orderRow = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(so.order_id).first();
    const orderTo = stage === 1 ? decision === "APPROVED" ? "APPROVED" : "BLOCKED" : decision === "APPROVED" ? "AWAITING_PAYMENT" : "BLOCKED";
    const t = await setOrderStatus(
      db,
      orderRow,
      orderTo,
      decision === "APPROVED" ? null : "REJECTED_BY_ADMIN"
    );
    if (t.error) {
      await audit3(
        db,
        approved_by || "admin",
        "ORDER_STATUS_SYNC_DEFERRED",
        "order",
        so.order_id,
        { reason: t.error }
      );
    }
    await audit3(
      db,
      approved_by || "admin",
      decision === "APPROVED" ? `APPROVE_STAGE_${stage}` : `REJECT_STAGE_${stage}`,
      "supplier_order",
      String(supplier_order_id)
    );
    return Response.json({ ok: true, supplier_order_id, stage, new_status: newStatus });
  }
  if (path === "/api/kill-switch" && request.method === "GET") {
    const ks = await readKillSwitch(db);
    return Response.json({
      kill_switch_active: ks.state !== "OFF",
      kill_switch_state: ks.state,
      kill_switch_reason: ks.reason,
      note: "active = no procurement, no checkout, no purchase; orders saved for handling"
    });
  }
  if (path === "/api/kill-switch" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.active !== "boolean") {
      return Response.json({ error: "active_must_be_boolean" }, { status: 400 });
    }
    if (body.active === false && body.confirm !== "DISABLE_KILL_SWITCH") {
      return Response.json({ error: "confirm_required", confirm: "DISABLE_KILL_SWITCH" }, { status: 400 });
    }
    const active = body.active ? 1 : 0;
    await db.prepare(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('kill_switch', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(JSON.stringify({ active: body.active })).run();
    await audit3(db, body.by || "admin", active ? "KILL_SWITCH_ON" : "KILL_SWITCH_OFF", "system", "kill_switch");
    return Response.json({ ok: true, kill_switch_active: !!active });
  }
  if (path === "/api/suppliers" && request.method === "GET") {
    const rows = await db.prepare("SELECT * FROM suppliers ORDER BY id").all();
    return Response.json(rows.results);
  }
  if (path.startsWith("/api/suppliers/") && request.method === "POST" && path.endsWith("/pause")) {
    const code = path.split("/")[3];
    const body = await request.json().catch(() => ({}));
    const paused = body.paused ? 1 : 0;
    await db.prepare("UPDATE suppliers SET paused = ?, updated_at = datetime('now') WHERE code = ?").bind(paused, code).run();
    await audit3(db, body.by || "admin", paused ? "PAUSE_SUPPLIER" : "UNPAUSE_SUPPLIER", "supplier", code);
    return Response.json({ ok: true, supplier: code, paused: !!paused });
  }
  if (path === "/api/dashboard" && request.method === "GET") {
    const today = await db.prepare(
      `SELECT COUNT(*) AS orders,
              SUM(CASE WHEN financial_status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
              SUM(CASE WHEN status = 'PURCHASED' OR status = 'TRACKING_PENDING'
                        OR status = 'SHIPPED' THEN 1 ELSE 0 END) AS purchased_orders,
              SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_orders
       FROM orders WHERE date(created_at) = date('now')`
    ).first();
    const snapshots = await db.prepare(
      `SELECT AVG(net_profit) AS avg_net_profit, AVG(net_margin) AS avg_net_margin,
              SUM(net_profit) AS total_net_profit
       FROM profit_snapshots WHERE date(created_at) = date('now') AND stage = 'ORDER'`
    ).first();
    const kpi = await db.prepare(
      `SELECT
        (SELECT COUNT(*) FROM supplier_orders WHERE status IN ('PENDING','READY_FOR_APPROVAL_1')) AS awaiting_approval,
        (SELECT COUNT(*) FROM supplier_orders WHERE status = 'PURCHASED') AS purchases,
        (SELECT COUNT(*) FROM orders WHERE status IN ('PURCHASED','TRACKING_PENDING')) AS in_fulfillment,
        (SELECT COUNT(*) FROM orders WHERE status = 'BLOCKED') AS blocked,
        (SELECT COALESCE(SUM(total_price),0) FROM orders WHERE is_test = 0) AS revenue,
        (SELECT COALESCE(SUM(customer_revenue),0) FROM supplier_orders WHERE status = 'PENDING') AS expected_revenue,
        (SELECT COALESCE(SUM(supplier_total),0) FROM supplier_orders WHERE status = 'PENDING') AS supplier_spend_pending,
        (SELECT COUNT(*) FROM orders WHERE is_test = 1) AS test_orders,
        (SELECT COUNT(*) FROM alerts WHERE read = 0) AS unread_alerts`
    ).first();
    const expectedProfit = await db.prepare(
      `SELECT COALESCE(SUM(expected_net_profit),0) v FROM supplier_orders
        WHERE status IN ('PENDING','READY_FOR_APPROVAL_1')`
    ).first();
    const actualProfit = await db.prepare(
      `SELECT COALESCE(SUM(expected_net_profit),0) v FROM supplier_orders
        WHERE status IN ('PURCHASED','SHIPPED','COMPLETED')`
    ).first();
    const spend = await db.prepare(
      `SELECT COALESCE(SUM(supplier_total),0) v FROM supplier_orders
        WHERE status IN ('PURCHASED','SHIPPED','COMPLETED')`
    ).first();
    const ks = await db.prepare(`SELECT value FROM system_settings WHERE key='kill_switch'`).first();
    let killSwitch = false;
    try {
      killSwitch = !!(ks && JSON.parse(ks.value).active);
    } catch {
    }
    return Response.json({ today, profit: snapshots, kpi: {
      ...kpi,
      expected_profit_pending: expectedProfit.v,
      actual_profit_purchased: actualProfit.v,
      supplier_spend_purchased: spend.v,
      kill_switch_active: killSwitch
    } });
  }
  if (path === "/api/verify-shopify" && request.method === "GET") {
    try {
      const token = await getAdminToken(env2);
      const data = await shopifyGraphQL(env2, "{ shop { name myshopifyDomain } }");
      return Response.json({
        ok: true,
        shop: data.shop.name,
        domain: data.shop.myshopifyDomain
      });
    } catch (e) {
      return Response.json(
        { ok: false, error: String(e.message || e).slice(0, 120) },
        { status: 502 }
      );
    }
  }
  return Response.json({ error: `route_not_implemented:${path}` }, { status: 501 });
}
__name(handleApi, "handleApi");
async function audit3(db, actor, action, entityType, entityId) {
  await db.prepare(
    `INSERT INTO audit_log (actor, action, entity_type, entity_id) VALUES (?, ?, ?, ?)`
  ).bind(actor, action, entityType, entityId).run();
}
__name(audit3, "audit");
export {
  ProcurementLock,
  index_default as default,
  parseKillSwitch as __parseKillSwitch,
  shopifyGraphQL as __shopifyGraphQL,
  guardAction as __guardAction
};
//# sourceMappingURL=index.js.map
