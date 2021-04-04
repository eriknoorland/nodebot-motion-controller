const EventEmitter = require('events');
const SerialPort = require('serialport');
const cobs = require('cobs');
const Ramp = require('ramp.js');
const robotlib = require('robotlib');
const Parser = require('./Parser');
const motionTarget = require('./motionTarget');

const REQUEST_START_FLAG = 0xA3;
const REQUEST_IS_READY = 0x01;
const REQUEST_SET_DIRECTION = 0x10;
const REQUEST_SET_SPEED = 0x11;
const REQUEST_STOP = 0x13;

const FORWARD = [1, 0];
const REVERSE = [0, 1];
const ROTATE_LEFT = [0, 0];
const ROTATE_RIGHT = [1, 1];

const accelerationMode = 'SINUSOIDAL_INOUT';

/**
 * motionController
 * @param {String} path
 * @param {Object} config
 * @return {Object}
 */
const motionController = (path, config) => {
  const eventEmitter = new EventEmitter();
  const poses = [{ x: 0, y: 0, phi: 0 }];
  const motionTargets = [];
  const requiredConfigProps = [
    'LOOP_TIME',
    'MOTOR_ENCODER_CPR',
    'MOTOR_GEAR_RATIO',
    'NUM_TICKS_PER_REVOLUTION',
    'WHEEL_BASE',
    'BASE_CIRCUMFERENCE',
    'LEFT_WHEEL_DIAMETER',
    'LEFT_WHEEL_CIRCUMFERENCE',
    'LEFT_DISTANCE_PER_TICK',
    'RIGHT_WHEEL_DIAMETER',
    'RIGHT_WHEEL_CIRCUMFERENCE',
    'RIGHT_DISTANCE_PER_TICK',
    'MIN_SPEED',
    'MAX_SPEED',
    'MAX_ROTATION_SPEED',
  ];

  let isConfigComplete = false;
  let missingConfigProps = [];
  let speedRamp = new Ramp();
  let trackPose = false;
  let port;
  let parser;

  /**
   * Constructor
   */
  function constructor() {
    isConfigComplete = requiredConfigProps.every(prop => !!config[prop]);

    if (!isConfigComplete) {
      missingConfigProps = requiredConfigProps.filter(prop => !config[prop]);
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

      let isReady = false;

      const isReadyTimeout = setTimeout(() => {
        if (!isReady) {
          writeToSerialPort([REQUEST_START_FLAG, REQUEST_IS_READY]);
        }
      }, 1000);

      port = new SerialPort(path, { baudRate: 115200 });
      parser = new Parser();

      port.pipe(parser);

      port.on('error', error => console.log('motionController:error', error));
      port.on('disconnect', () => console.log('motionController:disconnect'));
      port.on('close', () => console.log('motionController:close'));
      port.on('open', onPortOpen);

      parser.on('odometry', onOdometryData);
      parser.on('ready', () => {
        clearTimeout(isReadyTimeout);
        isReady = true;
        resolve();
      });
    });
  }

  /**
   * Ask controller for ready response
   * @return {Promise}
   */
  function isReady() {
    writeToSerialPort([REQUEST_START_FLAG, REQUEST_IS_READY]);

    return Promise.resolve();
  }

  /**
   * Set whether to track the robots poses or not
   * @param {Boolean} toggle
   */
  function setTrackPose(toggle) {
    trackPose = toggle;
  }

  /**
   * Returns the last pose
   * @return {Object}
   */
  function getPose() {
    return poses[poses.length - 1];
  }

  /**
   * Appends a pose to the poses array
   * @param {Object} pose
   */
  function appendPose(pose) {
    poses.push(pose);
    eventEmitter.emit('pose', pose);
  }

  /**
   * Control the left and right motor speed directly
   * @param {Number} speedLeft
   * @param {Number} speedRight
   */
  function speedLeftRight(speedLeft, speedRight) {
    const tickSpeedLeft = robotlib.utils.math.speedToTickSpeed(speedLeft, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
    const tickSpeedRight = robotlib.utils.math.speedToTickSpeed(speedRight, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);
    const directionLeft = speedLeft > 0 ? 1 : 0;
    const directionRight = speedRight > 0 ? 0 : 1;

    writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_DIRECTION, directionLeft, directionRight]);
    writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_SPEED, tickSpeedLeft, tickSpeedRight]);
  }

  /**
   * Moves the robot at a certain speed keeping the given heading
   * @param {Number} speed
   * @param {Function} callback
   * @param {Number} heading
   */
  function speedHeading(speed, heading, callback) {
    return new Promise(resolve => {
      if (speed > config.MAX_SPEED) {
        speed = config.MAX_SPEED;
      }

      writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_DIRECTION, ...FORWARD]);
      speedRamp = new Ramp();

      motionTargets.push(
        motionTarget('speedHeading:start', {
          init: () => speedRamp.go(speed, 1000, accelerationMode, 'ONCEFORWARD'),
          update: callback,
        }));

      motionTargets.push(
        motionTarget('speedHeading:decelerate', {
          init: () => speedRamp.go(0, 1000, accelerationMode, 'ONCEFORWARD'),
          update: ({ leftTicks, rightTicks }) => !leftTicks && !rightTicks,
          complete: () => stop(true).then(resolve),
        }));
    });
  }

  /**
   * Moves the robot for a given distance keeping the given heading
   * @param {Number} distance
   * @param {Number} heading
   * @return {Promise}
   */
  function distanceHeading(distance, heading) {
    return new Promise(resolve => {
      const startPose = getPose();
      const { speed: maxSpeed, acc } = calculateMaxSpeed(distance, config.MAX_SPEED);
      const decelerationDistance = 0.5 * (maxSpeed - config.MIN_SPEED);
      const slowDistance = 2 * config.MIN_SPEED;
      const decelerationTarget = distance - (slowDistance + decelerationDistance);
      const hasAcceleration = acc > 1;

      writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_DIRECTION, ...FORWARD]);
      speedRamp = new Ramp();

      motionTargets.push(
        motionTarget('distanceHeading:start', {
          init: () => speedRamp.go(maxSpeed, acc, accelerationMode, 'ONCEFORWARD'),
          update: () => true,
        }));

      if (hasAcceleration) {
        motionTargets.push(
          motionTarget('distanceHeading:decelerate', {
            update: ({ pose }) => robotlib.utils.math.calculateDistance(startPose, pose) >= decelerationTarget,
            complete: () => speedRamp.go(config.MIN_SPEED, acc, accelerationMode, 'ONCEFORWARD'),
          }));
      }

      motionTargets.push(
        motionTarget('distanceHeading:stop', {
          update: ({ pose }) => robotlib.utils.math.calculateDistance(startPose, pose) >= distance,
          complete: () => stop(true).then(resolve),
        }));
    });
  }

  /**
   * Rotates the robot with the given angle
   * @param {Number} angle
   * @return {Promise}
   */
  function rotate(angle) {
    return new Promise(resolve => {
      const startPose = getPose();
      const distance = Math.abs((config.WHEEL_BASE / 2) * angle);
      const direction = angle < 0 ? ROTATE_LEFT : ROTATE_RIGHT;
      const { speed: maxSpeed, acc } = calculateMaxSpeed(distance, config.MAX_ROTATION_SPEED);
      const decelerationDistance = 0.5 * (maxSpeed - config.MIN_SPEED);
      const slowDistance = 2 * config.MIN_SPEED;
      const decelerationTarget = (distance - (slowDistance + decelerationDistance)) / (config.WHEEL_BASE / 2);
      const hasAcceleration = acc > 1;

      const update = (target, { pose }) => {
        const rotationDifference = Math.abs(robotlib.utils.math.getRelativeAngleDifference(pose.phi, startPose.phi));
        const targetDiff = robotlib.utils.math.getRelativeAngleDifference(target, rotationDifference);

        return targetDiff <= 0.01; // FIXME?
      };

      writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_DIRECTION, ...direction]);
      speedRamp = new Ramp();

      motionTargets.push(
        motionTarget('rotate:start', {
          init: () => speedRamp.go(maxSpeed, acc, accelerationMode, 'ONCEFORWARD'),
          update: () => true,
        }));

      if (hasAcceleration) {
        motionTargets.push(
          motionTarget('rotate:decelerate', {
            update: update.bind(null, Math.abs(decelerationTarget)),
            complete: () => speedRamp.go(config.MIN_SPEED, acc, accelerationMode, 'ONCEFORWARD'),
          }));
      }

      motionTargets.push(
        motionTarget('rotate:stop', {
          update: update.bind(null, Math.abs(angle)),
          complete: () => stop(true).then(resolve),
        }));
    });
  }

  /**
   * Stops the robot
   * @param {Boolean} hardStop
   * @return {Promise}
   */
  function stop(hardStop = false) {
    return new Promise(resolve => {
      if (hardStop) {
        speedRamp.go(0, 0, accelerationMode, 'ONCEFORWARD');
        writeToSerialPort([REQUEST_START_FLAG, REQUEST_STOP]);

        robotlib.utils.pause(250)
          .then(resolve);

        return;
      }

      speedRamp.go(0, 1000, accelerationMode);
      robotlib.utils.pause(1250)
        .then(resolve);
    });
  }

  /**
   * Moves the robot to the given coordinate
   * @param {Object} coordinate - { x, y }
   * @return {Promise}
   */
  async function move2XY(coordinate) {
    const currentPose = getPose();
    const distance = robotlib.utils.math.calculateDistance(currentPose, coordinate);
    const heading = robotlib.utils.math.getHeadingFromPoseToCoordinate(currentPose, coordinate);

    await rotate(heading);
    await distanceHeading(distance, heading);

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

  function onOdometryData(data) {
    const pose = calculatePose(poses[poses.length - 1], data);
    const actualSpeed = calculateSpeed(data);
    const targetSpeed = robotlib.utils.math.fixedDecimals(speedRamp.update() || 0, 2);
    const tickSpeed = robotlib.utils.math.speedToTickSpeed(targetSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
    let leftTickSpeed = tickSpeed;
    let rightTickSpeed = tickSpeed;

    eventEmitter.emit('odometry', data);
    eventEmitter.emit('speed', { target: targetSpeed, actual: actualSpeed });

    if (motionTargets.length) {
      const motionTarget = motionTargets[0];
      motionTarget.init();

      const result = motionTarget.update({ ...data, tickSpeed, pose });

      if (result === true) {
        motionTarget.complete();
        motionTargets.shift();
      }/* else {
        leftTickSpeed += result.leftSpeedCorrection;
        rightTickSpeed += result.righkSpeedCorrection;
      }*/
    }

    writeToSerialPort([REQUEST_START_FLAG, REQUEST_SET_SPEED, leftTickSpeed, rightTickSpeed]);
  }

  function calculatePose(lastPose, { leftTicks, rightTicks }) {
    const distanceLeft = leftTicks * config.LEFT_DISTANCE_PER_TICK;
    const distanceRight = rightTicks * config.RIGHT_DISTANCE_PER_TICK;
    const distanceCenter = (distanceLeft + distanceRight) / 2;
    const x = robotlib.utils.math.fixedDecimals(lastPose.x + (distanceCenter * Math.cos(lastPose.phi)), 4);
    const y = robotlib.utils.math.fixedDecimals(lastPose.y + (distanceCenter * Math.sin(lastPose.phi)), 4);
    const phi = lastPose.phi - ((distanceRight - distanceLeft) / config.WHEEL_BASE);
    const pose = { x, y, phi };

    if (trackPose && (JSON.stringify(pose) !== JSON.stringify(lastPose))) {
      appendPose(pose);
    }

    return pose;
  }

  function calculateMaxSpeed(distance, desiredSpeed) {
    if (distance <= config.MIN_SPEED * 2) {
      return { speed: config.MIN_SPEED, acc: 1 };
    }

    const accDistance = desiredSpeed * 0.5;
    const decDistance = (desiredSpeed - config.MIN_SPEED) * 0.5;
    const stopDistance = config.MIN_SPEED * 2;

    if (accDistance + decDistance + stopDistance > distance) {
      return calculateMaxSpeed(distance, desiredSpeed - 25);
    }

    return { speed: desiredSpeed, acc: 1000 };
  };

  function calculateSpeed({ leftTicks, rightTicks }) {
    const currentLeftTickSpeed = robotlib.utils.math.tickSpeedToSpeed(leftTicks, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
    const currentRightTickSpeed = robotlib.utils.math.tickSpeedToSpeed(rightTicks, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

    return (currentLeftTickSpeed + currentRightTickSpeed) * 0.5;
  }

  function writeToSerialPort(data) {
    port.write(cobs.encode(Buffer.from(data), true));
  }

  function close() {
    port.close();
  }

  function onPortOpen() {
    console.log('motionController:open');

    port.flush(error => {
      if (error) {
        console.log('motionController:error', error);
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
    setTrackPose,
    getPose,
    appendPose,
    speedLeftRight,
    speedHeading,
    distanceHeading,
    rotate,
    stop,
    move2XY,
    move2XYPhi,
  };
};

module.exports = motionController;
