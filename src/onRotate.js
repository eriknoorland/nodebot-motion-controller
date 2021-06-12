const robotlib = require('robotlib');
const requests = require('./requests');
const motorDirections = require('./motorDirections');
const calculateMaxSpeed = require('./utils/calculateMaxSpeed');
const slope = require('./utils/slope');

// TODO add ability to force direction?

const makeOnRotate = (config, writeToSerialPort) => {
  return (angle, startPose, resolve) => {
    const distance = Math.abs((config.WHEEL_BASE / 2) * angle);
    const direction = angle > 0 ? motorDirections.ROTATE_RIGHT : motorDirections.ROTATE_LEFT;
    const maxSpeed = calculateMaxSpeed(distance, config.MAX_SPEED, config.MIN_SPEED);
    const decelerationDistance = 0.5 * (maxSpeed - config.MIN_SPEED);
    const decelerationTarget = distance - (config.MIN_SPEED + decelerationDistance);

    let distanceTravelled = 0;
    let speedSetpoint = maxSpeed;
    let isAtDecelerationTarget = false;
    let isAtStopTarget = false;
    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return ({ leftTicks, rightTicks }, pose) => {
      const leftDistanceTravelled = Math.abs(leftTicks * config.LEFT_DISTANCE_PER_TICK);
      const rightDistanceTravelled = Math.abs(rightTicks * config.RIGHT_DISTANCE_PER_TICK);

      distanceTravelled += (leftDistanceTravelled + rightDistanceTravelled) * 0.5;

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      if (!isAtDecelerationTarget && distanceTravelled >= decelerationTarget) {
        isAtDecelerationTarget = true;
        speedSetpoint = config.MIN_SPEED;
      }

      if (!isAtStopTarget && distanceTravelled >= distance) {
        isAtStopTarget = true;
        speedSetpoint = 0;
      }

      const leftTickSpeed = robotlib.utils.math.speedToTickSpeed(leftSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
      const rightTickSpeed = robotlib.utils.math.speedToTickSpeed(rightSpeed, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

      writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);

      if (isAtStopTarget && !leftTickSpeed && !rightTickSpeed) {
        resolve();
      }
    };
  };
};

module.exports = makeOnRotate;

/*
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
*/