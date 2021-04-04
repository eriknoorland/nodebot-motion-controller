const EventEmitter = require('events');
const SerialPort = require('serialport');
const cobs = require('cobs');
const Parser = require('./Parser');

/**
 * motorController
 * @param {String} path
 * @param {Number} baudRate
 * @return {Object}
 */
const motorController = (path, baudRate = 115200) => {
  const eventEmitter = new EventEmitter();

  let port;
  let parser;

  /**
   * Constructor
   */
  function constructor() {

  }

  /**
   * Init
   * @return {Promise}
   */
  function init() {
    return new Promise((resolve, reject) => {
      if (port) {
        setTimeout(reject, 0);
      }

      port = new SerialPort(path, { baudRate });
      parser = new Parser();

      port.pipe(parser);

      port.on('error', error => eventEmitter.emit('error', error));
      port.on('disconnect', () => eventEmitter.emit('disconnect'));
      port.on('close', () => eventEmitter.emit('close'));
      port.on('open', onPortOpen);

      parser.on('ready', resolve);
      parser.on('odometry', data => eventEmitter.emit('odometry', data));
    });
  }

  /**
   * Port open event handler
   */
  function onPortOpen() {
    port.flush(error => {
      if (error) {
        eventEmitter.emit('error', error);
      }
    });
  }

  constructor();

  return {
    init,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
  };
};

module.exports = motorController;
