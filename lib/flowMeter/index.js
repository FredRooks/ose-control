'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/kind');
exports = M.exports;

/** Doc {{{1
 * @submodule control.distributor
 */

/**
 * @caption Flow meter kind
 *
 * @readme
 * Kind defining flow meters of liquids or gasses.
 *
 * Each entry of this kind established a new [link] to the master by
 * sending a `registerPin()` command with `type: "din"`, `flavour:
 * "counter"` and a client socket. The `state.value` of the entry then
 * increments with each master pin change. State changes are debounced
 * using the `state.debounce` value.
 *
 * @class control.lib.flowMeter
 * @extend ose.lib.kind
 * @type class
 */

// Public {{{1
exports.homeInit = function(entry) {  // {{{2
  entry.onActions(Actions);

  entry.action('registerPin',  // Register switch at master.
    {
      index: entry.data.pin,
      type: 'din',
      flavour: 'counter'
//      caption: entry.getCaption(),
    },
    entry.data.master
  )
    .logError()
  ;

/*
  entry.onActions({master: onMaster}, true);

  entry.action('register', {
    pin: entry.data.pin,
    type: 'counter',
    caption: entry.getCaption(),
  })
    .cb(function(err, data) {console.log('****************** FLOW METER REGISTER PIN RESPONSE', err, data)})
    .post(entry.data.master)
  ;
*/

/*
  var pins = {};
  pins[entry.data.pin] = {
    type: 'counter',
    direction: 'out',
    caption: entry.getCaption(),
    entry: entry.identify()
  };

  entry.postTo(entry.data.master, {registerPins: pins});
  */
};

// }}}1
var Actions = {};  // {{{1
Actions.masterPin = function(that, action, cb) {  // {{{2
  // TODO action.data.at => action.at

  if (action.data.index !== that.data.pin) {
//    M.log.unhandled('Invalid PIN', {entry: that.identify(), index: action.data.index, expected: that.data.pin});
    cb(Ose.error(that, 'INVALID_ARGS', 'Invalid PIN', {index: action.data.index, expected: that.data.pin}));
    return;
  }

  that.setState({value: action.data.value});
};

// }}}1
