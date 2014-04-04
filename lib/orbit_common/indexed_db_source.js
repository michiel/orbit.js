import Orbit from 'orbit/main';
import Source from 'orbit_common/source';
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

var normalizeIndexDBRefs = function() {
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

    normalizeIndexDBRefs();

    Source.prototype.init.apply(this, arguments);

    options = options || {};

    this.schema         = schema;
    this.namespace      = options['namespace']     || 'orbit';
    this._dbVersion     = options['version']       || 1;
    this._autoIncrement = options['autoIncrement'] || false;

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
    var id = record[this.schema.idField];
    if (!id) {
      this.schema.initRecord(type, record);
      id = record[this.schema.idField];
    }
  },

  /////////////////////////////////////////////////////////////////////////////
  // Transformable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _transform: function(operation) {
    console.error("Not implemented - _transform");
    throw new Error("Method not implemented");
  },

  /////////////////////////////////////////////////////////////////////////////
  // Requestable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _find: function(type, id) {
    console.error("Not implemented - _find");
    throw new Error("Method not implemented");
  },

  /////////////////////////////////////////////////////////////////////////////
  // Internals
  /////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////
  // IndexDB handlers
  /////////////////////////////////////////////////////////////////////////////

  _idbInit: function() {
    console.log("IndexedDB._idbInit");
    return new Orbit.Promise(function(resolve, reject) {
        var request = window.indexedDB.open(this.namespace, this._dbVersion);  

        request.onupgradeneeded = this._idbUpgradeNeeded.bind(this);

        request.onsuccess = function (e) {
          console.log("IndexedDB._idbInit : SUCCESS", resolve);
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
      console.log("IndexedDB errorFor: " + e.target.errorCode);
      reject(e);
    }.bind(this);
  },

  _idbVersionChange: function(e) {
    console.log("IndexedDB._idbVersionChange : ", e);
    if (!e.version) {
      this._idb.close();
    }
  },

  _idbUpgradeNeeded: function(e) {
    console.log("IndexedDB._idbUpgradeNeeded");
    var objectStore = e.currentTarget.result.createObjectStore(
      this.namespace, { 
        keyPath       : this.schema.idField,
        autoIncrement : false
      }
    );

    console.log("IndexedDB._idbUpgradeNeeded : models");
    for (var model in this.schema.models) {
      console.log("IndexedDB._idbUpgradeNeeded : model", model);
      objectStore.createIndex(model, model, { unique: false });
    }

  },

  _idbAdd: function(obj) {
    console.log("IndexedDB._idbAdd");
    return new Orbit.Promise(function(resolve, reject) {
        var transaction = this._idb.transaction(this.namespace, "readwrite");
        var objectStore = transaction.objectStore(this.namespace);                    
        var request     = objectStore.add(obj);

        request.onerror = this._errorFor(reject);

        request.onsuccess = function (e) {
          console.log("IndexedDB._idbAdd.request.onsuccess", e);
          console.log("IndexedDB._idbAdd.request.onsuccess - will be resolved with transaction.oncomplete");
        }.bind(this);

        transaction.onerror = this._errorFor(reject);

        transaction.oncomplete = function(e) {
          console.log("IndexedDB._idbAdd.transaction.oncomplete", e);
          // Handle completion
          resolve();
        }.bind(this);

      }.bind(this)
    );
  },

  _idbGet: function(id) {
    console.log("IndexedDB._idbGet");
    return new Orbit.Promise(function(resolve, reject) {
        var transaction = this._idb.transaction(this.namespace);  
        var objectStore = transaction.objectStore(this.namespace);
        var request     = objectStore.get(id);  

        request.onerror = this._errorFor(reject);

        request.onsuccess = function(evt) {  
          console.log("Result for id ", id, request.result);
          resolve(request.result);
        }.bind(this);

      }.bind(this)
    );
  },

  _idbDeleteDatabase: function() {
    console.log("IndexedDB._idbDeleteDatabase");
    return new Orbit.Promise(function(resolve, reject) {
        this._idb.close();
        var request = window.indexedDB.deleteDatabase(this.namespace);

        request.onsuccess = function(e) {
          console.log("IndexdDB._idbDeleteDatabase : success");
          this._idb = null;
          resolve(e);
        };

        request.onerror = this._errorFor(reject);

      }.bind(this)
    );
  }

});


export default IndexedDBSource;
