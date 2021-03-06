'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Doc {{{1
 * @submodule control.room
 */

/**
 * @caption Switch relay response socket
 *
 * @readme
 * [Response socket] relaying the switch entry events to the slave.
 *
 * @class control.lib.switch.relay
 * @type class
 */

// Public {{{1
function C(entry, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @param entry {Object} Switch entry
 * @param socket {Object} Client socket
 *
 * @method constructor
 */

  this.entry = entry;

  relay(this, 'press');
  relay(this, 'release');
  relay(this, 'tap');
  relay(this, 'hold');

  Ose.link.open(this, socket);
};

exports.close = function(req) {  // {{{2
/**
 * Close handler
 *
 * @param req {Object}
 *
 * @method close
 */

  this.entry.removeListener('press', this.press);
  this.entry.removeListener('release', this.release);
  this.entry.removeListener('tap', this.tap);
  this.entry.removeListener('hold', this.hold);
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * @param err {Object} [Error] instance
 *
 * @method error
 */

  M.log.error(err);

  this.close(err.message);
};

// }}}1
// Private {{{1
function relay(that, ev) {  // {{{2
  that[ev] = that.entry.on(ev, function(data) {
    that.link[ev](data);
  });
};

// }}}1
