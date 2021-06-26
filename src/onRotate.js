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
    let hasPassedDecelerationTarget = false;
    let hasPassedStopTarget = false;
    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return ({ leftTicks, rightTicks }, pose) => {
      const leftDistanceTravelled = Math.abs(leftTicks * config.LEFT_DISTANCE_PER_TICK);
      const rightDistanceTravelled = Math.abs(rightTicks * config.RIGHT_DISTANCE_PER_TICK);

      distanceTravelled += (leftDistanceTravelled + rightDistanceTravelled) * 0.5;

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      if (!hasPassedDecelerationTarget && distanceTravelled >= decelerationTarget) {
        hasPassedDecelerationTarget = true;
        speedSetpoint = config.MIN_SPEED;
      }

      if (!hasPassedStopTarget && distanceTravelled >= distance) {
        hasPassedStopTarget = true;
        speedSetpoint = 0;
        leftSpeed = speedSetpoint;
        rightSpeed = speedSetpoint;
      }

      const leftTickSpeed = robotlib.utils.math.speedToTickSpeed(leftSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
      const rightTickSpeed = robotlib.utils.math.speedToTickSpeed(rightSpeed, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

      writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);

      if (hasPassedStopTarget) {
        resolve();
      }
    };
  };
};

module.exports = makeOnRotate;
