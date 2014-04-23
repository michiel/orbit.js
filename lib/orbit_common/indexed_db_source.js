import Orbit from 'orbit/main';
import Source from './source';
import { assert } from 'orbit/lib/assert';
import { clone, extend } from 'orbit/lib/objects';
import { RecordNotFoundException, RecordAlreadyExistsException } from './lib/exceptions';

var supportsIndexedDB = function() {
  try {
    return 'indexedDB' in window && window['indexedDB'] !== null;
  } catch(e) {
    return false;
  }
};

var normalizeIndexedDBRefs = function() {
  window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;

  if ('webkitIndexedDB' in window) {
    window.IDBTransaction = window.webkitIDBTransaction;
    window.IDBKeyRange = window.webkitIDBKeyRange;
  } else if ('mozIndexedDB' in window) {
    window.IDBTransaction = window.mozIDBTransaction;
    window.IDBKeyRange = window.mozIDBKeyRange;
  }
};

/**
 * @class IndexedDBSource
 * @extends Source
 * @namespace OC
 * @description

 Source for storing data in IndexdDB storage

 * @param schema
 * @param options
 * @constructor
 */
var IndexedDBSource = function() {
  this.init.apply(this, arguments);
};

extend(IndexedDBSource.prototype, Source.prototype, {
  constructor: IndexedDBSource,

  init: function(schema, options) {
    console.log("IndexedDBSource.init");

    assert('Your browser does not support IndexedDB!', supportsIndexedDB());
    assert('JSONAPISource requires Orbit.Promise be defined', Orbit.Promise);

    normalizeIndexedDBRefs();

    Source.prototype.init.apply(this, arguments);

    options = options || {};

    this.schema         = schema;
    this.namespace      = options['namespace']     || 'orbit';
    this._dbVersion     = options['version']       || 1;
    this._autoIncrement = options['autoIncrement'] || true;

    this._idb = null;

    this._idbInit().then(function() {
        console.log("IndexedDBSource.init - callback");
        if (!options.callback) {
          console.error("IndexedDBSource.init - no callback passed in constructor options!");
        } else {
          setTimeout(options.callback, 0);
        }
      });

  },

  initRecord: function(type, record) {
    console.log("IndexedDBSource.initRecord", type, record);
    this._idbInitRecord(type, record);
  },

  /////////////////////////////////////////////////////////////////////////////
  // Transformable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _transform: function(operation) {
    console.log("IndexedDBSource._transform", operation);

    var path  = operation.path;
    var data  = operation.value;
    var type  = path[0];
    var id    = path[1];

    if (path.length > 2) {
      // PATCH
  
      console.log("IndexedDBSource._transform UNIMPLEMENTED");

      if (path[0] === 'links') {

        if (operation.op === 'remove') {
          if (path.length > 2) {
          } else {
          }

        } else {
          if (path.length > 2) {
          } else {
          }
        }
      }

    } else {
      // POST, PUT, DELETE

      switch(operation.op) {

      // POST
      case 'add':
        return this._idbAdd(type, data);

      // PUT
      case 'replace':
        return this._idbUpdate(type, data);

      // DELETE
      case 'remove':
        return this._idbDelete(type, data[this.schema.idField]);

      default:
        console.error("IndexedDBSource._transform : unknown operation " + operation.op);
        throw new Error("IndexedDBSource._transform : unknown operation " + operation.op);
      }

    }
  },

  /////////////////////////////////////////////////////////////////////////////
  // Requestable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _find: function(type, id) {
    console.log("IndexedDBSource._find");
    return this._idbGet(type, id);
  },

  /////////////////////////////////////////////////////////////////////////////
  // Internals
  /////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////
  // IndexedDB handlers
  /////////////////////////////////////////////////////////////////////////////

  _idbInit: function() {
    console.log("IndexedDBSource._idbInit");
    return new Orbit.Promise(function(resolve, reject) {
        var request = window.indexedDB.open(this.namespace, this._dbVersion);  

        request.onupgradeneeded = this._idbUpgradeNeeded.bind(this);

        request.onsuccess = function (e) {
          console.log("IndexedDBSource._idbInit.onsuccess");
          this._idb = request.result;
          this._idb.onversionchange = this._idbVersionChange.bind(this);
          resolve(e);
        }.bind(this);

        request.onerror = this._errorFor(reject);

      }.bind(this)
    );
  },

  _idbError: function(e) {
    console.log("IndexedDB error: " + e.target.errorCode);
  },

  _errorFor: function(reject) {
    return function(e) {
      this._idbError(e);
      reject(e);
    }.bind(this);
  },

  _idbVersionChange: function(e) {
    console.log("IndexedDBSource._idbVersionChange : ", e);
    if (!e.version) {
      this._idb.close();
    }
  },

  _idbUpgradeNeeded: function(e) {
    console.log("IndexedDBSource._idbUpgradeNeeded");
    for (var model in this.schema.models) {
      console.log("IndexedDBSource._idbUpgradeNeeded : model", model);
      var objectStore = e.currentTarget.result.createObjectStore(
        model, {
          keyPath       : this.schema.idField,
          autoIncrement : this._autoIncrement
        }
      );
      for (var attr in this.schema.models[model].attributes) {
        var props = this.schema.models[model].attributes[attr];
        objectStore.createIndex(attr, attr, { unique: props.unique || false });
      }
    }
  },

  _idbInitRecord: function(data) {
    console.log("IndexedDBSource._idbInitRecord");
    if (data[this.schema.idField] === null) {
      console.warn("IndexedDBSource._idbInitRecord : id is null, setting field");
      var id = this.schema.generateId();
      data[this.schema.idField] = id;
    }
  },

  _idbAdd: function(type, data) {
    console.log("IndexedDBSource._idbAdd");
    this._idbInitRecord(data);
    return new Orbit.Promise(function(resolve, reject) {
        console.log("IndexedDBSource._idbAdd.Promise");
        var objectStore = this._idb.transaction([type], "readwrite").objectStore(type);
        var request     = objectStore.add(data);

        request.onerror   = this._errorFor(reject);
        request.onsuccess = function (e) {
          console.log("IndexedDBSource._idbAdd.request.onsuccess", data);
        }.bind(this);

        objectStore.transaction.onerror    = this._errorFor(reject);
        objectStore.transaction.oncomplete = function(e) {
          console.log("IndexedDBSource._idbAdd.objectStore.transaction.oncomplete");
          resolve(data);
        }.bind(this);

      }.bind(this)
    );
  },

  _idbGet: function(type, id) {
    console.log("IndexedDBSource._idbGet");
    return new Orbit.Promise(function(resolve, reject) {
        var objectStore = this._idb.transaction([type]).objectStore(type);  
        var request     = objectStore.get(id);  

        request.onerror   = this._errorFor(reject);
        request.onsuccess = function(evt) {  
          console.log("Result for id ", id, request.result);
          resolve(request.result);
        }.bind(this);

        objectStore.transaction.onerror    = this._errorFor(reject);
        objectStore.transaction.oncomplete = function(e) {
          console.log("IndexedDBSource._idbGet.objectStore.transaction.oncomplete");
        }.bind(this);

      }.bind(this)
    );
  },

  _idbDelete: function(type, id) {
    console.log("IndexedDBSource._idbDelete");
    return new Orbit.Promise(function(resolve, reject) {
        var objectStore = this._idb.transaction([type], "readwrite").objectStore(type);
        var request     = objectStore.delete(id);

        request.onerror   = this._errorFor(reject);
        request.onsuccess = function(evt) {
          console.log("IndexedDBSource._idbDelete.onsuccess : id ", id, request.result);
          resolve(request.result);
        }.bind(this);

        objectStore.transaction.onerror    = this._errorFor(reject);
        objectStore.transaction.oncomplete = function(e) {
          console.log("IndexedDBSource._idbDelete.objectStore.transaction.oncomplete");
        }.bind(this);

      }.bind(this)
    );
  },

  _idbUpdate: function(type, data) {
    console.log("IndexedDBSource._idbUpdate");
    return new Orbit.Promise(function(resolve, reject) {
        var objectStore = this._idb.transaction([type], "readwrite").objectStore(type);
        var request     = objectStore.put(data);

        request.onerror   = this._errorFor(reject);
        request.onsuccess = function(evt) {
          console.log("IndexedDBSource._idbUpdate.request.onsuccess", data);
          resolve(data);
        }.bind(this);

        objectStore.transaction.onerror    = this._errorFor(reject);
        objectStore.transaction.oncomplete = function(e) {
          console.log("IndexedDBSource._idbUpdate.objectStore.transaction.oncomplete");
        }.bind(this);

      }.bind(this)
    );
  },

  _idbDeleteDatabase: function() {
    console.log("IndexedDBSource._idbDeleteDatabase");
    return new Orbit.Promise(function(resolve, reject) {
        this._idb.close();
        var request = window.indexedDB.deleteDatabase(this.namespace);

        request.onerror   = this._errorFor(reject);
        request.onsuccess = function(e) {
          console.log("IndexedDBSource._idbDeleteDatabase : success");
          this._idb = null;
          resolve(e);
        }.bind(this);

      }.bind(this)
    );
  }

});


export default IndexedDBSource;
