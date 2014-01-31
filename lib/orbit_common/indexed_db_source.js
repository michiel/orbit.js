import Orbit from 'orbit/main';
import Source from 'orbit_common/source';
import { assert } from 'orbit/lib/assert';
import { clone, extend } from 'orbit/lib/objects';
import { RecordNotFoundException, RecordAlreadyExistsException } from 'orbit_common/lib/exceptions';

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

    this._idbInit();

  },

  initRecord: function(type, record) {
    throw new Error("Method not implemented");
  },

  /////////////////////////////////////////////////////////////////////////////
  // Transformable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _transform: function(operation) {
    throw new Error("Method not implemented");
  },

  /////////////////////////////////////////////////////////////////////////////
  // Requestable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _find: function(type, id) {
    throw new Error("Method not implemented");
  },

  /////////////////////////////////////////////////////////////////////////////
  // Internals
  /////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////
  // IndexDB handlers
  /////////////////////////////////////////////////////////////////////////////

  _idbInit: function() {
    var request = window.indexedDB.open(this.namespace, this._dbVersion);  

    request.onsuccess = function (e) {
      this._idb = request.result;
    }.bind(this);

    request.onerror         = this._idbError.bind(this);
    request.onupgradeneeded = this._idbUpgradeNeeded.bind(this);
  },

  _idbError: function(e) {
    console.log("IndexedDB error: " + e.target.errorCode);
  },

  _idbUpgradeNeeded: function(e) {
    var objectStore = e.currentTarget.result.createObjectStore(
      this.namespace, { 
        keyPath       : this.schema.idField,
        autoIncrement : false
      }
    );

    for (var model in this.schema.models) {
      objectStore.createIndex(model, model, { unique: false });
    }

  },

  _idbAdd: function(obj) {
    var transaction = this._idb.transaction(this.namespace, window.IDBTransaction.READ_WRITE);
    var objectStore = transaction.objectStore(this.namespace);                    

    var request = objectStore.add(obj);

    request.onerror = this._idbError.bind(this);
    request.onsuccess = function (e) {
      // Handle success
    }.bind(this);

    transaction.onerror = this._idbError.bind(this);
    transaction.oncomplete = function(e) {
      // Handle completion
    }.bind(this);

  },

  _idbGet: function(id) {
    var transaction = this._idb.transaction(this.namespace);  
    var objectStore = transaction.objectStore(this.namespace);  

    var request = objectStore.get(id);  

    request.onerror = this._idbError.bind(this);
    request.onsuccess = function(evt) {  
      console.log("Result for id ", id, request.result);  
    }.bind(this);

  }

});


export default IndexedDBSource;
