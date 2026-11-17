// PyBot browser demo — Pyodide worker.
// Loads Pyodide, downloads the original `bot` package from
// https://github.com/huggingface/pybot (Apache-2.0) as a base64-split
// zip (botzip.json + botzip.NN.b64), unpacks it into the Pyodide FS,
// imports it and answers chat turns with bot.runtime.turn().

importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.js");

let pyodide = null;
let turnFn = null;
let resetFn = null;

function stage(name, extra) {
  postMessage(Object.assign({ type: "stage", stage: name }, extra || {}));
}

function b64ToBytes(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function init() {
  stage("pyodide");
  pyodide = await loadPyodide();
  pyodide.setStdout({ batched: function () {} });
  pyodide.setStderr({ batched: function () {} });

  stage("download", { loaded: 0, total: 0 });
  const manifest = await (await fetch("botzip.json")).json();
  const zip = new Uint8Array(manifest.zipBytes);
  let off = 0;
  for (const name of manifest.chunks) {
    const text = await (await fetch(name)).text();
    const bytes = b64ToBytes(text.trim());
    zip.set(bytes, off);
    off += bytes.length;
    postMessage({ type: "progress", loaded: off, total: manifest.zipBytes });
  }

  stage("unpack");
  pyodide.FS.mkdirTree("/pybot");
  pyodide.FS.writeFile("/pybot/bot.zip", zip);
  await pyodide.runPythonAsync(
    "import zipfile, sys\n" +
    "zipfile.ZipFile('/pybot/bot.zip').extractall('/pybot')\n" +
    "sys.path.insert(0, '/pybot')\n"
  );

  stage("import");
  await pyodide.runPythonAsync(
    "from bot import runtime\n" +
    "_memory = {}\n" +
    "def _turn(text):\n" +
    "    r = runtime.turn(text, _memory)\n" +
    "    reply = ' '.join(str(r['reply']).split()) or 'Hello!'\n" +
    "    return reply, r.get('module')\n" +
    "def _reset():\n" +
    "    global _memory\n" +
    "    _memory = {}\n"
  );
  turnFn = pyodide.globals.get("_turn");
  resetFn = pyodide.globals.get("_reset");
  stage("ready");
}

init().catch(function (err) {
  postMessage({ type: "error", message: String(err && err.message || err) });
});

onmessage = function (e) {
  const d = e.data || {};
  if (d.type === "turn" && turnFn) {
    const t0 = performance.now();
    let reply = "Hello!";
    let module = null;
    try {
      const out = turnFn(d.text).toJs();
      reply = out[0];
      module = out[1];
    } catch (err) {
      // Mirror the CLI: a turn never fails, it falls back.
      reply = "Hello!";
      module = null;
    }
    postMessage({ type: "reply", reply: reply, module: module, ms: Math.round(performance.now() - t0) });
  } else if (d.type === "reset" && resetFn) {
    resetFn();
    postMessage({ type: "reset-done" });
  }
};
