import Notifier from 'orbit/notifier';

var notifier;

module("Unit - Notifier", {
  setup: function() {
    notifier = new Notifier;
  },

  teardown: function() {
    notifier = null;
  }
});

test("it exists", function() {
  ok(notifier);
});

test("it maintains a list of listeners", function() {
  var listener1 = function() {},
      listener2 = function() {};

  equal(notifier.listeners.length, 0);

  notifier.addListener(listener1);
  notifier.addListener(listener2);
  equal(notifier.listeners.length, 2);

  notifier.removeListener(listener1);
  equal(notifier.listeners.length, 1);

  notifier.removeListener(listener2);
  equal(notifier.listeners.length, 0);
});

test("it notifies listeners when emitting a simple message", function() {
  expect(2);

  var listener1 = function(message) {
        equal(message, 'hello', 'notification message should match');
      },
      listener2 = function(message) {
        equal(message, 'hello', 'notification message should match');
      };

  notifier.addListener(listener1);
  notifier.addListener(listener2);

  notifier.emit('hello');
});

test("it notifies listeners using custom bindings, if specified", function() {
  expect(4);

  var binding1 = {},
      binding2 = {},
      listener1 = function(message) {
        equal(this, binding1, 'custom binding should match');
        equal(message, 'hello', 'notification message should match');
      },
      listener2 = function(message) {
        equal(this, binding2, 'custom binding should match');
        equal(message, 'hello', 'notification message should match');
      };

  notifier.addListener(listener1, binding1);
  notifier.addListener(listener2, binding2);

  notifier.emit('hello');
});

test("it notifies listeners when publishing any number of arguments", function() {
  expect(4);

  var listener1 = function() {
        equal(arguments[0], 'hello', 'notification message should match');
        equal(arguments[1], 'world', 'notification message should match');
      },
      listener2 = function() {
        equal(arguments[0], 'hello', 'notification message should match');
        equal(arguments[1], 'world', 'notification message should match');
      };

  notifier.addListener(listener1);
  notifier.addListener(listener2);

  notifier.emit('hello', 'world');
});

test("it notifies listeners when polling with a simple message and returns the first response", function() {
  expect(3);

  var listener1 = function(message) {
        equal(message, 'hello', 'notification message should match');
      },
      listener2 = function(message) {
        equal(message, 'hello', 'notification message should match');
        return 'bonjour';
      },
      listener3 = function(message) {
        ok(false, 'this listener should not be reached');
        return 'bonjour';
      };

  notifier.addListener(listener1);
  notifier.addListener(listener2);
  notifier.addListener(listener3);

  equal(notifier.poll('hello'), 'bonjour', 'poll response should match the response of the first listener to respond');
});
