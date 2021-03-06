'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Pin = M.class('./index');

/** Docs  // {{{1
 * @submodule control.pin
 */

/**
 * @caption Pin List
 *
 * @readme
 * List of pins registered to the owning entry.
 * 
 * @class control.lib.pin.list
 * @type class
 */

/**
 * Controller entry 
 *
 * @property master
 * @type Object
 */

/**
 * List of connected sockets to individual pins
 *
 * @property pins
 * @type Object
 */

/**
 * List of pin types
 *
 * @property types
 * @type Object
 */

/**
 * List of available pins with their capabilities
 *
 * @property pinCaps 
 * @type Object
 */

// Public {{{1
function C(master, types, pins) {  // {{{2
/**
 * Constructor
 *
 * @param master {Object} Controller entry
 * @param types {Object} List of pin types
 * @param pins {Object} List of pins
 *
 * @method init
 */

  this.pins = {};

  this.master = master;

  if (! master.state) {
    master.state = {};
  }
  master.state.pins = {};
  master.state.pinTypes = {};

  this.types = {};
  for (var key in types) {
    var type = types[key];

    if (! ('name' in type)) {
      type.name = key;
    }

    this.types[key] = type;

    master.state.pinTypes[key] = {
      name: key,
    };
  }

  this.pinCaps = pins;
};

exports.register = function(req, socket) {  // {{{2
/**
 * Register a pin.
 * 
 * @param req {Object} TODO request
 * @param req.index {String} Index of pin to be registered
 * @param req.type {String} Pin type
 * @param req.flavour {String} Pin flavour
 * @param socket {Object} TODO socket
 *
 * @returns {Object} Pin instance
 *
 * @method register
 */

//  console.log('REGISTER PIN', req);

  if (req.index in this.pins) {
    Ose.link.error(socket, Ose.error(this, 'alreadyRegistered', req.index));
    return;
  }

  var type = this.types[req.type];
  if (! type) {
    Ose.link.error(socket, Ose.error(this, 'missingCaps', req.type));
    return;
  }

  var caps = this.pinCaps[req.index];
  if (! caps) {
    Ose.link.error(socket, Ose.error(this, 'pinNotFound', req.index));
    return;
  }

  if (! (req.type in caps)) {
    Ose.link.error(socket, Ose.error(this, 'missingCaps', req.type));
    return;
  }

  var setup = req.flavour || req.type;
  if (setup.indexOf('/') < 0) {
    setup = 'ose-control/lib/pin/' + setup;
  }
  setup = require(setup);

  if (typeof setup !== 'function') {
    Ose.link.error(socket, Ose.error(this, 'invalidflavour', req.flavour));
    return;
  }

  var result = this.pins[req.index] = new Pin(this, req.index, type, caps[req.type]);

  var resp = {
    index: result.index,
    caps: caps,
  };

  var state = {
    type: req.type,
    flavour: req.flavour,
    registered: result.registered,
    caps: caps,
  };

  if (! result.send) {
    result.send = pinSend;
  }

  setup(result, req, state, resp);

  if (type.setup) {
    type.setup(result, req, state, resp);
  }

  var s = this.master.state.pins[result.index];
  if (s) {
    Ose._.extend(state, s);
  }

  // Write pin state info to "master.state".
  s = {};
  s[result.index] = state;
  this.master.setState({pins: s});

  Ose.link.open(result, socket, resp);

  return result;
};

exports.remove = function(pin) {  // {{{2
/**
 * Removes pin
 *  
 * @param {Object} Pin to be removed
 *
 * @method remove
 */

  if (! (pin.index in this.pins)) {
    throw Ose.error(this, 'invalidPin', pin.index);
  }

  delete this.pins[pin.index];

  // Remove everything from pin state except `value` and `at`
  var c = this.master.state.pins[pin.index];  // Current pin state
  if (c) {
    var s = {};  // New pin state
    for (var key in c) {
      switch(key) {
      case 'value':
      case 'at':
        break;
      default:
        s[key] = null;
      }
    }
    var n = {};  // New state
    n[pin.index] = s;

    this.master.setState({pins: n});
  }
};

exports.update = function(index, value) {  // {{{2
/**
 * Called from master entry (device), when a pin value change is
 * detected
 *
 * @param index {String} Index of pin to be updated
 * @param value {Number} Value of physical pin
 *
 * @method update
 */

//  console.log('PIN UPDATE');

  var pin = this.pins[index];
  if (pin) {
    pin.send(value);
    return;
  }

  if (index in this.pinCaps) {
    var s = {};
    s[index] = {
      value: value,
      at: new Date().getTime()
    };
    this.master.setState({pins: s});
    return;
  }

  M.log.error(Ose.error(this, 'invalidPin', {index: index, value: value}));
  return;
};

exports.readAll = function() {  // {{{2
/**
 * Read raw values of all registered pins
 * 
 * @method readAll
 */

  for (var key in this.pins) {
    var pin = this.pins[key];

    if (pin.type && pin.type.read) {
      pin.type.read(pin);
    }
  }
};

// }}}1
// Private {{{1
function pinSend(value) {  // {{{2
  // "this" is bound to pin.

  var d = {
    value: value,
    at: Ose._.now()
  };
  this.link.update(d);

  var s = {};
  s[this.index] = {
    value: d.value,
    at: d.at,
  };
  this.pins.master.setState({pins: s});
};

// }}}1
