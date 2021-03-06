'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/kind');
exports = M.exports;

/** Doc {{{1
 * @caption Rooms
 *
 * @readme
 * This component defines basic room entry kinds. By configuring
 * entries of these kinds, it is possible to define an indoor
 * environment and its behaviour.
 *
 * @module control
 * @submodule control.room
 * @main control.room
 */

/**
 * @caption Room kind
 *
 * @readme
 * [Entry kind] defining behaviour of rooms.
 *
 * Various activities can be defined for each room. Activities govern
 * the behaviour of rooms. When an activity is selected, it sends
 * commands to entries and trigger scheduled actions.
 *
 * Each activity is identified by its name and can be selected by a
 * command sent to the room entry. Each activity should be a
 * descendant of the [activity class].
 *
 * Example:
 *
 * The living room may have the following activities defined:
 *
 * - watching TV (lights dimmed, TV on, blinds down if dark outside,
     etc.)
 * - tidying (lights fully on, radio on)
 * - reading (lights half on, multimedia off)
 *
 * Another example:
 *
 * The house may have the following activities:
 * - at home (full comfort)
 * - empty house (detection of intruders, heating down, etc.)
 * - vacation (random actions simulating the presence of inhabitants)
 *
 * @class control.lib.room
 * @extend ose.lib.kind
 * @type class
 */

/**
 * Activity
 *
 * Currently selected room activity
 *
 * @property state.activity
 * @type Object
 */

/**
 * Activity name
 *
 * Currently selected room activity name
 *
 * @property state.activity.name
 * @type String
 */

/**
 * Configurations of activities for current room. Keys are names, and
 * values are optional configuration objects.
 *
 * @property data.activities
 * @type Object
 */

/**
 * Initialization methods for activities. Keys are names, and values
 * are functions.
 *
 * @property activities
 * @type {Object}
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('activity', onActivity);
};

exports.homeInit = function(entry) {  // {{{2
  if (! entry.state) entry.state = {};
  if (! entry.activities) entry.activities = {};
};

// }}}1
// Private {{{1
function onActivity(req, socket) {  // {{{2
/**
 * [Command handler] changes room activity.
 *
 * @param req {String | Object} Request object or activity name
 * @param req.name {String} Activity name
 * @param [socket] {Object} Optional response socket
 */

  console.log('ACTIVITY RECEIVED', req);

  if (typeof req !== 'object') {
    req = {name: req};
  }

  var result;
  var e = this.entry;

  result =
    e.activities[req.name] ||
    e.data && e.data.activities && e.data.activities[req.name]
  ;

  switch (typeof result) {
  case 'object':
    break;
  case 'string':
    result = new (M.class(result))(req.name, e);
    break;
  case 'undefined':
    Ose.link.error(socket, Ose.error(this.entry, 'INVALID_REQ', 'Activity not found', req.name));
    return;
  default:
    Ose.link.error(socket, Ose.error(e, 'INVALID_REQ', req));
    return;
  }

  if (e.state.activity === req.name) {
    result.update(req, socket);
    return;
  }

  var old = e.activities[e.state.activity];
  old && old.stop();

  result.start(req, socket);

  e.setState({activity: req.name});

  return;
};

// }}}1
