'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/kind');
exports = M.exports;

/* * Doc {{{1
 * @submodule control.room
 */

/* *
 * @caption Blinds kind
 *
 * @readme
 * [Entry kind] defining blinds behaviour.
 *
 * TODO
 * Each heater establishes a [link] to `data.master` entry with `registerPin()` [command] and to optional `data.tariff` entry to watch low and high tariff switching.
 *
 * @class control.lib.blinds
 * @extend ose.lib.kind
 * @type class
 */

/* *
 * Controller entry identification object.
 *
 * The heater entry establishes a new link to the controller.
 *
 * @property data.master
 * @type String | Object
 */

/* *
 * Master pin index
 *
 * Index of digital input pin on the master controller
 *
 * @property data.pin
 * @type String
 */

/* *
 * Tariff entry identification object.
 *
 * If specified, the heater establishes a new link to the tariff and gets controlled by it.
 *
 * @property data.tariff
 * @type String | Object
 */

// Public {{{1
exports.homeInit = function(entry) {  // {{{2
  entry.onActions(Actions, true);

  entry.postTo(entry.data.master, {register: {
    pin: entry.data.up,
    type: 'digital',
    direction: 'out',
    caption: entry.getCaption() + ' Up',
    conflict: entry.data.down,
    entry: entry.identify()
  }});

  entry.postTo(entry.data.master, {register: {
    pin: entry.data.down,
    type: 'digital',
    direction: 'out',
    caption: entry.getCaption() + ' Down',
    conflict: entry.data.up,
    entry: entry.identify()
  }});
};

// }}}1
var Actions = {};  // {{{1
Actions.pic = function(data) {  // {{{2
//  console.log('BLINDS ON PIC', data);

  if (data.registering && data.value) {
    var action = {};
    action[data.pin] = 0;

    this.postTo(this.data.master, action);

    return;
  }

  var direction = getDirection(data.pin, this.data);

  if (this.timer) {
    clearTimeout(this.timer);
    delete this.timer;
  }

  if (
    this.request &&
    (this.request.state !== 'confirm') &&
    (this.request.direction !== direction) &&
    (Boolean(this.request.value) !== Boolean(data.value))
  ) {
    M.log.warning('Invalid request to confirm.', this.request);
    delete this.request;
  }

  if (data.value) {  // Blinds started to move. {{{3
    this.setState({moving: {
      direction: direction,
      start: new Date().getTime()
    }});

    if (this.request) {  // There is pending request.
      confirmRequest(this);
    } else {  // This is not reaction to request.
      startRequest(this, {
        direction: direction,
        value: 1
      });
    }
  } else {  // Blinds stopped. {{{3
    if (this.state.moving && (this.state.moving.direction === direction)) {
      this.setState({
        moving: null,
      });
    }

    if (this.request) {
      startRequest(this, this.request.next);
    }
  }

  // }}}3

  return;
};

function confirmRequest(that) {  // {{{2
  that.request.state = 'do';

  if (that.timer) {
    clearTimeout(that.timer);
    delete that.timer;
  }

  var timer =
    that.timer =
    setTimeout(onTime, that.request.timeout || DefaultTimeout)
  ;

  function onTime() {
    if (timer === that.timer) {
      delete that.timer;

      if (that.request && that.request.value && (that.request.state === 'do')) {
        that.request.value = 0;

        sendRequest(that);
      } else {
        M.log.unhandled('Invalid request', that.request);
      }
    } else {
      M.log.unhandled('Timer was not cleared.');
    }
  }
};

/*
Actions.pic = function(data) {  // {{{2
  console.log('BLINDS ON PIC', data);

  var timer;
  var that = this;
  var direction = getDirection(data.pin, this.data);

  if (data.value) {  // Blinds started to move. {{{3
    if (this.timer) {
      M.log.unhandled('Previous request is in process.');
    } else {
      timer = this.timer = setTimeout(
        onTime,
        (this.request && this.request.timeout) || 6000
      );
    }

    this.setState({
      moving: {
        direction: direction,
        start: new Date().getTime(),
      },
    });
  } else {  // Blinds stopped. {{{3
    if (data.registering) {
      return;
    }

    if (this.timer) {
      M.log.notice('Blinds timeout cleared by another request.');
      clearTimeout(this.timer);
      delete this.timer;
    }

    this.setState({
      moving: null,
    });
  }

  if (this.request) {
    if (
      (this.request.direction === direction) &&
      (Boolean(this.request.value) === Boolean(data.value))
    ) {
    } else {
      delete this.request;
    }
  }

  return;

  function onTime() {  // {{{3
    if (timer === that.timer) {
      delete that.timer;

      sendRequest(that, direction, 0);
    } else {
      M.log.unhandled('Timer was not cleared.');
    }
  };

  // }}}3
};
*/
Actions.move = function(data) {  // {{{2
//  console.log('BLINDS MOVE ACTION', data);

  if (data === 'stop') {
    if (this.state.moving) {
      startRequest(this, {
        direction: this.state.moving.direction,
        value: 0
      });
    }
  } else {
    startRequest(this, {
      direction: data,
      value: 1
    });
  }
};

// }}}1
// Private {{{1
var DefaultTimeout = 6000;

function startRequest(that, request) {  // {{{2
  if (that.timer) {
    clearTimeout(that.timer);
    delete that.timer;
  }

  if (! request) {
    delete that.request;

    return;
  }

  if (request.value) {
    if (that.state.moving) {  // Blinds is already moving.
      if (that.state.moving.direction === request.direction) {  // Blinds is moving requested direction.
        that.request = request;
        confirmRequest(that);

        return;
      } else {  // Blinds is moving oposite direction.
        that.request = {
          direction: that.state.moving.direction,
          value: 0,
          next: request
        }
        sendRequest(that);

        return;
      }
    } else {
      that.request = request;
      sendRequest(that);

      return;
    }
  }

  that.request = request;
  sendRequest(that);

  return;
};

function sendRequest(that) {  // {{{2
  if (! that.request) {
    M.log.unhandled('There is no request to send.');
    return;
  }

  that.request.state = 'confirm';

  if (that.timer) {
    clearTimeout(that.timer);
    delete that.timer;
    M.log.unhandled('There is pending timer.');
  }

  var timer =
    that.timer =
    setTimeout(onTime, 1000)
  ;

  var action = {};
  action[that.data[that.request.direction]] = that.request.value;

//  console.log('BLINDS SEND MASTER', action);

  that.postTo(that.data.master, action);

  function onTime() {
    M.log.unhandled('Master didn\'t fullfiled request');

    if (timer === that.timer) {
      delete that.timer;
    }
  };
};

function getDirection(pin, data) {  // {{{2
  if (pin === data.up) {
    return 'up';
  } else
  if (pin === data.down) {
    return 'down';
  } else {
    M.log.unhandled('Invalid pin.', pin);
    return;
  }
};

// }}}1

