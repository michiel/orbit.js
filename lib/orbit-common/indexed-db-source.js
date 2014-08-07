import Orbit from 'orbit/main';
import Source from './source';
import Schema from './schema';
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
    assert('IndexedDBSource requires Orbit.Promise be defined', Orbit.Promise);
    assert(true, schema instanceof(Schema));

    Source.prototype.init.apply(this, arguments);

    options = options || {};

    this.schema         = schema;
    this.namespace      = options['namespace']     || 'orbit';
    this._dbVersion     = options['version']       || 1;
    this._autoIncrement = false; // options['autoIncrement'];

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
    this.schema.initRecord(type, record);
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

      var promise = null;

      switch(operation.op) {

      // POST
      case 'add':
        promise = this._idbAdd(type, data);
        break;

      // PUT
      case 'replace':
        promise = this._idbUpdate(type, data);
        break;

      // DELETE
      case 'remove':
        promise = this._idbDelete(type, data[this.schema.idField]);
        break;

      default:
        console.error("IndexedDBSource._transform : unknown operation " + operation.op);
        throw new Error("IndexedDBSource._transform : unknown operation " + operation.op);
      }

      return promise;

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

        request.onblocked       = this._idbBlocked.bind(this);
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

  _idbError: function(e, msg) {
    msg = msg || '';
    console.log("IndexedDB error: " + e.target.errorCode, e, msg);
  },

  _errorFor: function(reject, msg) {
    msg = msg || '';
    return function(e) {
      this._idbError(e, msg);
      reject(e);
    }.bind(this);
  },

  _idbVersionChange: function(e) {
    console.log("IndexedDBSource._idbVersionChange : ", e);
    if (!e.version) {
      this._idb.close();
    }
  },

  _idbBlocked: function(e) {
    console.log("IndexedDBSource._idbBlocked : ", e);

    var msg = "IndexedDBSource._idbBlocked : database version has changed and an older vesion is open in another tab";
    console.log(msg);

    //
    // TODO: Not a particularly user-friendly message, handle differently
    //

    if (window && window.alert) {
      window.alert(msg);
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

  _idbAdd: function(type, data) {
    console.log("IndexedDBSource._idbAdd");
    return new Orbit.Promise(
      function(resolve, reject) {
        console.log("IndexedDBSource._idbAdd.Promise");
        var transaction = this._idb.transaction([type], "readwrite");

        transaction.onerror = this._errorFor(reject, 'idbAdd.transaction');

        var objectStore = transaction.objectStore(type);
        var request     = objectStore.add(data);

        request.onerror    = this._errorFor(reject, 'idbAdd.request');

        request.onsuccess = function(e) {
          console.log("IndexedDBSource._idbAdd.Promise.onsuccess", data);
          resolve(data);
        }.bind(this);

      }.bind(this)
    );
  },

  _idbGet: function(type, id) {
    console.log("IndexedDBSource._idbGet", type, id);
    return new Orbit.Promise(
      function(resolve, reject) {
        if (!!!id) {
          console.log('IndexedDBSource._idbGet : No id given');
          reject('IndexedDBSource._idbGet : No id given');
          return;
        }
        console.log("IndexedDBSource._idbGet.Promise", type, id);
        var objectStore = this._idb.transaction([type], "readonly").objectStore(type);  
        var request     = objectStore.get(id);  

        request.onerror   = this._errorFor(reject, 'idbGet.request');
        request.onsuccess = function(e) {  
          console.log("Result for id ", id, e.target.result);
          resolve(e.target.result);
        }.bind(this);

        objectStore.transaction.onerror    = this._errorFor(reject, 'idbGet.transaction');
        objectStore.transaction.oncomplete = function(e) {
          console.log("IndexedDBSource._idbGet.objectStore.transaction.oncomplete");
        }.bind(this);

      }.bind(this)
    );
  },

  _idbDelete: function(type, id) {
    console.log("IndexedDBSource._idbDelete");
    return new Orbit.Promise(
      function(resolve, reject) {
        console.log("IndexedDBSource._idbDelete.Promise");
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
    return new Orbit.Promise(
      function(resolve, reject) {
        console.log("IndexedDBSource._idbUpdate.Promise");
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
    return new Orbit.Promise(
      function(resolve, reject) {
        console.log("IndexedDBSource._idbDeleteDatabase.Promise");
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
