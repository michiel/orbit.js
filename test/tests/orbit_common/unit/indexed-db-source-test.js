import Orbit from 'orbit/main';
import Schema from 'orbit-common/schema';
import IndexedDBSource from 'orbit-common/indexed-db-source';
import { Promise } from 'rsvp';

var source;

//
// Helper methods
//

function verifyIndexedDBIsEmpty(namespace) {
  return false;
}

function verifyIndexedDBContainsRecord(namespace, type, record, ignoreFields) {
  return false;
}

///////////////////////////////////////////////////////////////////////////////

//
// module.setup finishes async
// 

module("OC - IndexedDBSource", {
  setup: function() {
    Orbit.Promise = Promise;

    var schema = new Schema({
      idField: 'id',
      models: {
        planet: {
          attributes: {
            name: {
              type   : 'string',
              unique : true
            },
            classification: {
              type   : 'string',
              unique : false
            }
          },
          links: {
            moons: {type: 'hasMany', model: 'moon', inverse: 'planet'}
          }
        },
        moon: {
          attributes: {
            name: {
              type   : 'string',
              unique : true
            }
          },
          links: {
            planet: {type: 'hasOne', model: 'planet', inverse: 'moons'}
          }
        }
      }
    });

    stop();
    source = new IndexedDBSource(schema, {
        namespace : 'planets',
        version   : 1,
        callback  : function() {
          start();
        }
      });
  },

  teardown: function() {
    stop();
    source._idbDeleteDatabase().then(function() {
        start();
      }
    );
  }
});

test("it exists", function() {
  ok(source);
});

test("#add - can insert records and assign ids", function() {
  expect(4);

  stop();
  source.add('planet', {name: 'Jupiter', classification: 'gas giant'}).then(function(planet) {
    start();
    notStrictEqual(planet, null, "Add should return the new planet object");
    ok(planet.__id, 'orbit id should be defined');
    equal(planet.id, 12345, 'server id should be defined');
    equal(planet.name, 'Jupiter', 'name should match');
    equal(planet.classification, 'gas giant', 'classification should match');
  });
});
/*
test("#update - can update records", function() {
  expect(4);

  stop();
  source.update('planet', {id: 12345, name: 'Jupiter', classification: 'gas giant'}).then(function(planet) {
    start();
    ok(planet.__id, 'orbit id should be defined');
    equal(planet.id, 12345, 'server id should be defined');
    equal(planet.name, 'Jupiter', 'name should match');
    equal(planet.classification, 'gas giant', 'classification should match');
  });
});

test("#patch - can patch records", function() {
  expect(1);

  source.patch('planet', {id: 12345}, 'classification', 'gas giant').then(function() {
    ok(true, 'record patched');
  });
});

test("#remove - can delete records", function() {
  expect(1);

  source.remove('planet', {id: 12345}).then(function() {
    ok(true, 'record deleted');
  });
});

test("#link - can patch records with inverse relationships", function() {
  expect(1);

  source.link('planet', {id: 12345}, 'moons', {id: 987}).then(function() {
    ok(true, 'records linked');
  });
});

test("#unlink - can patch records with inverse relationships", function() {
  expect(1);

  source.unlink('planet', {id: 12345}, 'moons', {id: 987}).then(function() {
    ok(true, 'records unlinked');
  });
});

test("#find - can find individual records by passing in a single id", function() {
  expect(5);

  source.add('planet', {name: 'Jupiter', classification: 'gas giant'}).then(function(planet) {
    source.find('planet', planet.__id).then(function(planet) {
      ok(planet.__id, 'orbit id should be defined');
      equal(planet.id, 12345, 'server id should be defined');
      equal(planet.name, 'Jupiter', 'name should match');
      equal(planet.classification, 'gas giant', 'classification should match');
    });
  });
});

test("#find - can find all records", function() {
  expect(13);

  var records = [
    {id: 1, name: 'Jupiter', classification: 'gas giant'},
    {id: 2, name: 'Earth', classification: 'terrestrial'},
    {id: 3, name: 'Saturn', classification: 'gas giant'}
  ];

  source.find('planet').then(function(planets) {

    var planet, record;
    for (var i = 0; i < planets.length; i++) {
      planet = planets[i];
      record = records[i];
      ok(planet.__id, 'orbit id should be defined');
      equal(planet.id, record.id, 'server id should be defined');
      equal(planet.name, record.name, 'name should match');
      equal(planet.classification, record.classification, 'classification should match');
    }
  });
});

test("#find - can filter records", function() {
  expect(18);

  var records = [
    {id: 1, name: 'Mercury', classification: 'terrestrial'},
    {id: 2, name: 'Venus', classification: 'terrestrial'},
    {id: 3, name: 'Earth', classification: 'terrestrial'},
    {id: 4, name: 'Mars', classification: 'terrestrial'}
  ];

  source.find('planet', {classification: 'terrestrial'}).then(function(planets) {

    var planet, record;
    for (var i = 0; i < planets.length; i++) {
      planet = planets[i];
      record = records[i];
      ok(planet.__id, 'orbit id should be defined');
      equal(planet.id, record.id, 'server id should be defined');
      equal(planet.name, record.name, 'name should match');
      equal(planet.classification, record.classification, 'classification should match');
    }
  });
});
*/
