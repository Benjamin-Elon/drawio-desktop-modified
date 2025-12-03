// This file has been modified to load the file system bridge.
console.log('[Preload] Script running');

const {
    contextBridge,
    ipcRenderer
} = require("electron");

let reqId = 1;
let reqInfo = {};
let fileChangedListeners = {};

// (ADD)
function requestViaIPC(msg, callback, error) {
  msg.reqId = msg.reqId || (reqId++);
  reqInfo[msg.reqId] = { callback, error };
  if (msg.action === 'watchFile') {
    fileChangedListeners[msg.path] = msg.listener;
    delete msg.listener;
  }
  ipcRenderer.send('rendererReq', msg);
}


// Single, merged response handler
ipcRenderer.on('mainResp', (event, resp) => {
	try {
	  const cbEntry = reqInfo[resp.reqId];
	  if (cbEntry) {
		// Classic window.electron.request(...) path (core Draw.io)
		if (resp.error) cbEntry.error(resp.msg, resp.e);
		else cbEntry.callback(resp.data);
		delete reqInfo[resp.reqId];
	  } else {
		// No pending callback: assume postMessage-originated request
		window.postMessage(
		  { reqId: resp.reqId, data: resp.data, error: resp.error || null },
		  '*'
		);
	  }
	} catch (e) {
	  console.error('[Preload] mainResp handling error:', e);
	}
  });
  

ipcRenderer.on('fileChanged', (event, resp) => 
{
	var listener = fileChangedListeners[resp.path];
	
	if (listener)
	{
		listener(resp.curr, resp.prev);
	}
});

contextBridge.exposeInMainWorld(
	'electron', {
	  // simplified: use shared helper
	  request: (msg, callback, error) => requestViaIPC(msg, callback, error),
  
	  registerMsgListener: function(action, callback)
	  {
		ipcRenderer.on(action, function(event, args)
		{
		  callback(args);
		});
	  },
	  sendMessage: function(action, args)
	  {
		ipcRenderer.send(action, args);
	  },
	  listenOnce: function(action, callback)
	  {
		ipcRenderer.once(action, function(event, args)
		{
		  callback(args);
		});
	  }
	}
  );
  

contextBridge.exposeInMainWorld(
    'process', {
		type: process.type,
		versions: process.versions
	}
);

// (ADD) fsBridge: promise-based wrappers over your existing IPC actions
contextBridge.exposeInMainWorld('fsBridge', {
	readText(absPath) {
		return new Promise((resolve, reject) => {
		  requestViaIPC(
			{ action: 'readFile', filename: absPath, encoding: 'utf8' },
			(data) => resolve(({ ok: true, data })),    // wrap result
			(msg) => reject(new Error(msg || 'readText failed')) // clearer error
		  );
		});
	  },

	writeText(absPath, content) {
		return new Promise((resolve, reject) => {
		requestViaIPC(
			{ action: 'writeFile', path: absPath, data: String(content ?? ''), enc: 'utf8' },
			() => resolve(({ ok: true })),  // wrap result
			(msg) => reject(new Error(msg || 'writeFile failed'))
		);
		});
	},

	async openAndReadText(filters = [{ name: 'Text', extensions: ['txt','log','md','json','csv'] }]) {
		const filePaths = await new Promise((resolve, reject) => {
			requestViaIPC(
				{ action: 'showOpenDialog', filters, properties: ['openFile'] },
				(paths) => resolve(Array.isArray(paths) ? paths : []),
				(msg) => reject(new Error(msg || 'showOpenDialog failed'))
			  );

		});
	  
		if (!filePaths.length) return ({ ok: false, canceled: true }); // resolve canceled
	  
		const filePath = filePaths[0];
		const data = await new Promise((resolve, reject) => {
		  requestViaIPC(
			{ action: 'readFile', filename: filePath, encoding: 'utf8' },
			(txt) => resolve(txt),
			(msg) => reject(new Error(msg || 'openAndReadText failed')) // consistent msg
		  );
		});
	  
		return ({ ok: true, filePath, data }); // include ok flag
	  },

	  

	  unwatchFile(absPath) {
		return new Promise((resolve, reject) => {
		  requestViaIPC(
			{ action: 'unwatchFile', path: absPath },
			() => resolve(({ ok: true })),  // return {ok:true}
			(msg) => reject(new Error(msg || 'unwatchFile failed'))
		  );
		});
	  },
	  
	  // ( ADD) keep parity with unwatch
	  watchFile(absPath, listener) {
		requestViaIPC({ action: 'watchFile', path: absPath, listener }, () => {}, () => {});
	  },
    });



// (ADD): SQLite bridge
contextBridge.exposeInMainWorld('dbBridge', {
	/**
	 * Open a database and receive a handle id.
	 * @param {string} dbPath absolute path to .sqlite/.db
	 * @param {object} [opts] { readOnly?: boolean, pragma?: object }
	 * @returns {Promise<{ ok: true, dbId: string }>}
	 */
	open(dbPath, opts = {}) {
	  return new Promise((resolve, reject) => {
		requestViaIPC(
		  { action: 'dbOpen', dbPath, readOnly: !!opts.readOnly, pragma: opts.pragma || null },
		  (data) => resolve({ ok: true, dbId: data.dbId }),
		  (msg)  => reject(new Error(msg || 'dbOpen failed'))
		);
	  });
	},
  
	/**
	 * Close a previously opened database.
	 */
	close(dbId) {
	  return new Promise((resolve, reject) => {
		requestViaIPC(
		  { action: 'dbClose', dbId },
		  () => resolve({ ok: true }),
		  (msg) => reject(new Error(msg || 'dbClose failed'))
		);
	  });
	},
  
	/**
	 * Run a SELECT and get all rows.
	 * @returns {Promise<{ ok:true, rows:any[] }>}
	 */
	query(dbId, sql, params = undefined) {
	  return new Promise((resolve, reject) => {
		requestViaIPC(
		  { action: 'dbQuery', dbId, sql, params },
		  (rows) => resolve({ ok: true, rows }),
		  (msg)  => reject(new Error(msg || 'dbQuery failed'))
		);
	  });
	},
  
	/**
	 * Run an INSERT/UPDATE/DELETE.
	 * @returns {Promise<{ ok:true, changes:number, lastInsertRowid:string }>}
	 */
	exec(dbId, sql, params = undefined) {
	  return new Promise((resolve, reject) => {
		requestViaIPC(
		  { action: 'dbExec', dbId, sql, params },
		  (info) => resolve({ ok: true, changes: info.changes, lastInsertRowid: info.lastInsertRowid }),
		  (msg)   => reject(new Error(msg || 'dbExec failed'))
		);
	  });
	},
  
	/**
	 * Read a pragma value, e.g. journal_mode.
	 * @returns {Promise<{ ok:true, value:any }>}
	 */
	pragma(dbId, name) {
	  return new Promise((resolve, reject) => {
		requestViaIPC(
		  { action: 'dbPragma', dbId, name },
		  (value) => resolve({ ok: true, value }),
		  (msg)   => reject(new Error(msg || 'dbPragma failed'))
		);
	  });
	}
  });
	
  
console.log('[Preload] window.electron and fsBridge exposed');

// =======================================================
// (ADD) : postMessage bridge for contextIsolation=true
// =======================================================
window.addEventListener('message', (event) => {
	// Only accept messages from same window
	if (event.source !== window) return;
	const msg = event.data;
	if (!msg || typeof msg.type !== 'string') return;
  
	// 1. Handle electron requests from injected bridge
	if (msg.type === 'electron-request') {
		try {
		  const payload = msg.args && typeof msg.args === 'object' ? msg.args : {};
		  // payload must include reqId (injector supplies it)
		  ipcRenderer.send('rendererReq', payload);
		} catch (e) {
		  console.error('[PreloadBridge] Failed to forward electron-request:', e);
		}
	  }
	  
  
	// 2. Handle fs-readText (example action)
	if (msg.type === 'fs-readText') {
	  try {
		const { path, reqId } = msg;
		ipcRenderer.send('rendererReq', { action: 'readFile', filename: path, encoding: 'utf8', reqId });
	  } catch (e) {
		console.error('[PreloadBridge] Failed to forward fs-readText:', e);
	  }
	}
  });
  
  console.log('[PreloadBridge] postMessage bridge active');
  

  