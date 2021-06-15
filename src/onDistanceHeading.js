const robotlib = require('robotlib');
const requests = require('./requests');
const motorDirections = require('./motorDirections');
const calculateMaxSpeed = require('./utils/calculateMaxSpeed');
const slope = require('./utils/slope');

const makeOnDistanceHeading = (config, writeToSerialPort) => {
  return (distance, heading, startPose, resolve) => {
    const absoluteDistance = Math.abs(distance);
    const direction = distance > 0 ? motorDirections.FORWARD : motorDirections.REVERSE;
    const maxSpeed = calculateMaxSpeed(absoluteDistance, config.MAX_SPEED, config.MIN_SPEED);
    const decelerationDistance = 0.5 * (maxSpeed - config.MIN_SPEED);
    const decelerationTarget = absoluteDistance - (config.MIN_SPEED + decelerationDistance);
    const Kp = 125;

    let speedSetpoint = maxSpeed;
    let isAtDecelerationTarget = false;
    let isAtStopTarget = false;
    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return (deltaTicks, pose) => {
      const distanceTravelled = robotlib.utils.math.calculateDistance(startPose, pose);
      const headingError = heading - pose.phi;

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      leftSpeed += Math.round(headingError * Kp);
      rightSpeed -= Math.round(headingError * Kp);

      if (!isAtDecelerationTarget && distanceTravelled >= decelerationTarget) {
        isAtDecelerationTarget = true;
        speedSetpoint = config.MIN_SPEED;
      }

      if (!isAtStopTarget && distanceTravelled >= absoluteDistance) {
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

module.exports = makeOnDistanceHeading;
