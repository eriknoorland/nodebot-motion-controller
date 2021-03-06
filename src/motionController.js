const EventEmitter = require('events');
const SerialPort = require('serialport');
const cobs = require('cobs');
const robotlib = require('robotlib');
const Parser = require('./Parser');
const requests = require('./requests');
const makeOnDistanceCalibrationTest = require('./onDistanceCalibrationTest');
const makeOnSpeedHeading = require('./onSpeedHeading');
const makeOnDistanceHeading = require('./onDistanceHeading');
const makeOnRotate = require('./onRotate');
const makeOnSoftStop = require('./onSoftStop');
const makeEstimatePoseOdom = require('./utils/estimatePoseOdom');
const makeEstimatePoseIMU = require('./utils/estimatePoseIMU');

const {
  deg2rad,
  speedToTickSpeed,
  calculateDistance,
  getHeadingFromPoseToCoordinate,
  fixedDecimals,
} = robotlib.utils.math;

/**
 * motionController
 * @param {String} path
 * @param {Object} config
 * @param {Object} options
 * @return {Object}
 */
const motionController = (path, config, options = {}) => {
  const eventEmitter = new EventEmitter();
  const hasIMU = !!options.imu;
  const useIMU = hasIMU && options.useIMU;
  const onDistanceCalibrationTest = makeOnDistanceCalibrationTest(config, writeToSerialPort);
  const onSpeedHeading = makeOnSpeedHeading(config, writeToSerialPort);
  const onDistanceHeading = makeOnDistanceHeading(config, writeToSerialPort);
  const onRotate = makeOnRotate(config, writeToSerialPort);
  const onSoftStop = makeOnSoftStop(config, writeToSerialPort);
  const requiredConfigProps = [
    'LOOP_TIME',
    'WHEEL_BASE',
    'LEFT_DISTANCE_PER_TICK',
    'RIGHT_DISTANCE_PER_TICK',
    'ACCELERATION_STEP',
    'ACCELERATION',
    'MIN_SPEED',
    'MAX_SPEED',
    'MAX_ROTATION_SPEED',
    'HEADING_KP',
    'HEADING_KI',
    'HEADING_KD',
  ];

  let estimatePoseOdom = makeEstimatePoseOdom(config, fixedDecimals);
  let estimatePoseIMU = makeEstimatePoseIMU(config, fixedDecimals);
  let lastPoseOdom = { x: 0, y: 0, phi: 0 };
  let lastPoseIMU = { x: 0, y: 0, phi: 0 };
  let trackPose = false;
  let isConfigComplete = false;
  let missingConfigProps = [];
  let lastLeftTicks = null;
  let lastRightTicks = null;
  let lastHeading = null;
  let currentCommand;
  let port;
  let parser;

  /**
   * Constructor
   */
  function constructor() {
    isConfigComplete = requiredConfigProps.every(prop => config[prop] !== undefined);

    if (!isConfigComplete) {
      missingConfigProps = requiredConfigProps.filter(prop => config[prop] === undefined);
    }
  }

  /**
   * Init
   * @return {Promise}
   */
  function init() {
    return new Promise((resolve, reject) => {
      if (!isConfigComplete) {
        reject(`Config is not complete, missing: ${missingConfigProps.join(', ')}`);
      }

      if (port) {
        setTimeout(reject, 0);
        return;
      }

      let isTeensyReady = false;

      const isReadyTimeout = setTimeout(() => {
        if (!isTeensyReady) {
          writeToSerialPort([requests.START_FLAG, requests.IS_READY]);
        }
      }, 1000);

      if (hasIMU) {
        options.imu.on('data', onIMUData);
      }

      port = new SerialPort(path, { baudRate: 115200 });
      parser = new Parser();

      port.pipe(parser);

      port.on('error', error => eventEmitter.emit('error', error));
      port.on('disconnect', () => eventEmitter.emit('disconnect'));
      port.on('close', () => eventEmitter.emit('close'));
      port.on('open', onPortOpen);

      parser.on('odometry', onOdometryData);
      parser.on('debug', data => eventEmitter.emit('debug', data));
      parser.on('ready', () => {
        clearTimeout(isReadyTimeout);
        isTeensyReady = true;
        resolve();
      });
    });
  }

  /**
   * Ask controller for ready response
   * @return {Promise}
   */
  function isReady() {
    writeToSerialPort([requests.START_FLAG, requests.IS_READY]);

    return Promise.resolve();
  }

  /**
   * Set PID gains for left and right motor
   * @param {object} left { Kp, Ki, Kd }
   * @param {object} right { Kp, Ki, Kd }
   * @return {Promise}
   */
  function setPIDGains(left, right) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array
    // https://stackoverflow.com/questions/29629597/how-to-convert-float-into-byte-array
  }

  /**
   * Enable or disable tracking pose estimations for telemetry
   * @return {Promise}
   */
  function setTrackPose(isEnabled) {
    trackPose = isEnabled;

    return Promise.resolve();
  }

  /**
   * Set the debug level
   * @param {Number} debug
   * @return {Promise}
   */
  function setDebugLevel(debug = 0) {
    writeToSerialPort([requests.START_FLAG, requests.SET_DEBUG_LEVEL, debug]);

    return Promise.resolve();
  }

  /**
   * Returns the last pose
   * @return {Object}
   */
  function getPose() {
    if (useIMU){
      return lastPoseIMU;
    }

    return lastPoseOdom;
  }

  /**
   * Appends a pose
   * @param {Object} pose
   */
  function appendPose(pose) {
    lastPoseOdom = pose;
    lastPoseIMU = pose;

    emitPose(pose);
  }

  /**
   *
   * @param {Number} distance
   * @return {Promise}
   */
  function distanceCalibrationTest(distance) {
    const promise = new Promise(resolve => {
      currentCommand = onDistanceCalibrationTest(distance, resolve);
    });

    promise.then(resetCurrentCommand);

    return promise;
  }

  /**
   * Control the left and right motor speed directly
   * @param {Number} speedLeft
   * @param {Number} speedRight
   */
  function speedLeftRight(speedLeft, speedRight) {
    const tickSpeedLeft = speedToTickSpeed(Math.abs(speedLeft), config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
    const tickSpeedRight = speedToTickSpeed(Math.abs(speedRight), config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);
    const directionLeft = speedLeft > 0 ? 1 : 0;
    const directionRight = speedRight > 0 ? 0 : 1;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, directionLeft, directionRight]);
    writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, tickSpeedLeft, tickSpeedRight]);
  }

  /**
   * Moves the robot at a certain speed keeping the given heading
   * @param {Number} speed
   * @param {Number} heading
   * @param {Function} callback
   * @return {Promise}
   */
  function speedHeading(speed, heading, callback = () => {}) {
    const promise = new Promise(resolve => {
      currentCommand = onSpeedHeading(speed, heading, callback, resolve);
    });

    promise.then(resetCurrentCommand);

    return promise;
  }

  /**
   * Moves the robot for a given distance keeping the given heading
   * @param {Number} distance
   * @param {Number} heading
   * @return {Promise}
   */
  function distanceHeading(distance, heading) {
    const promise = new Promise(resolve => {
      currentCommand = onDistanceHeading(distance, heading, getPose(), resolve);
    });

    promise.then(resetCurrentCommand);

    return promise;
  }

  /**
   * Rotates the robot with the given angle
   * @param {Number} angle
   * @return {Promise}
   */
  function rotate(angle) {
    const promise = new Promise(resolve => {
      currentCommand = onRotate(angle, getPose(), lastLeftTicks, lastRightTicks, resolve);
    });

    promise.then(resetCurrentCommand);

    return promise;
  }

  /**
   * Stops the robot
   * @param {Boolean} hardStop
   * @return {Promise}
   */
  function stop(hardStop = false) {
    if (hardStop) {
      writeToSerialPort([requests.START_FLAG, requests.STOP]);

      return Promise.resolve();
    }

    const promise = new Promise(resolve => {
      currentCommand = onSoftStop(lastLeftTicks, lastRightTicks, resolve);
    });

    promise.then(resetCurrentCommand);

    return promise;
  }

  /**
   * Moves the robot to the given coordinate
   * @param {Object} coordinate - { x, y }
   * @param {Number} distanceOffset
   * @return {Promise}
   */
  async function move2XY(coordinate, distanceOffset = 0) {
    const currentPose = getPose();
    const distance = calculateDistance(currentPose, coordinate) + distanceOffset;
    const heading = getHeadingFromPoseToCoordinate(currentPose, coordinate);

    await rotate(heading);
    await distanceHeading(distance, heading + currentPose.phi);

    return Promise.resolve();
  }

  /**
   * Moves the robot to the given coordinate and rotate to the desired heading
   * @param {Object} coordinate - { x, y }
   * @param {Number} desiredHeading
   * @return {Promise}
   */
  async function move2XYPhi(coordinate, desiredHeading) {
    await move2XY(coordinate);

    const currentPose = getPose();
    const heading = desiredHeading - currentPose.phi;

    await rotate(heading);

    return Promise.resolve();
  }

  /**
   * Stops the robot immediately cancelling the current command
   * @returns {Promise}
   */
  async function emergencyStop() {
    resetCurrentCommand();

    return stop();
  }

  /**
   * Closes the serial connection
   * @returns {Promise}
   */
  function close() {
    return new Promise(resolve => {
      writeToSerialPort([requests.START_FLAG, 0x03]);

      port.flush(flushError => {
        port.close(closeError => {
          resolve();
        });
      });
    });
  }

  function onIMUData(heading) {
    lastHeading = deg2rad(heading);
  }

  function onOdometryData(data) {
    const { leftTicks, rightTicks } = data;

    lastLeftTicks = lastLeftTicks || leftTicks;
    lastRightTicks = lastRightTicks || rightTicks;

    const deltaLeftTicks = leftTicks - lastLeftTicks;
    const deltaRightTicks = rightTicks - lastRightTicks;
    const poseOdom = estimatePoseOdom(lastPoseOdom, deltaLeftTicks, deltaRightTicks);
    const poseIMU = estimatePoseIMU(lastPoseIMU, deltaLeftTicks, deltaRightTicks, lastHeading);
    const pose = useIMU ? poseIMU : poseOdom;
    const lastPose = useIMU ? lastPoseIMU : lastPoseOdom;
    const hasPoseChanged = JSON.stringify(pose) !== JSON.stringify(lastPose);

    lastLeftTicks = leftTicks;
    lastRightTicks = rightTicks;

    if (hasPoseChanged) {
      lastPoseOdom = poseOdom;
      lastPoseIMU = poseIMU;

      emitPose(pose);
    }

    if (currentCommand) {
      currentCommand(data, pose);
    }

    eventEmitter.emit('odometry', data);
  }

  function emitPose(pose) {
    if (trackPose) {
      eventEmitter.emit('pose', pose);
      eventEmitter.emit('pose_odom', lastPoseOdom);

      if (hasIMU) {
        eventEmitter.emit('pose_imu', lastPoseIMU);
      }
    }
  }

  function writeToSerialPort(data) {
    port.write(cobs.encode(Buffer.from(data), true));
  }

  function resetCurrentCommand() {
    currentCommand = null;
  }

  function onPortOpen() {
    port.flush(error => {
      if (error) {
        eventEmitter.emit('error', error);
      }
    });
  }

  constructor();

  return {
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    close,
    init,
    isReady,
    setPIDGains,
    setTrackPose,
    setDebugLevel,
    getPose,
    appendPose,
    distanceCalibrationTest,
    speedLeftRight,
    speedHeading,
    distanceHeading,
    rotate,
    stop,
    move2XY,
    move2XYPhi,
    emergencyStop,
  };
};

module.exports = motionController;
