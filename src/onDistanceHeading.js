const robotlib = require('robotlib');
const requests = require('./requests');
const motorDirections = require('./motorDirections');
const calculateMaxSpeed = require('./utils/calculateMaxSpeed');
const slope = require('./utils/slope');

const makeOnDistanceHeading = (config, writeToSerialPort) => {
  return (distance, heading, startPose, resolve) => {
    const absoluteDistance = Math.abs(distance);
    const direction = distance > 0 ? motorDirections.FORWARD : motorDirections.REVERSE;
    const { maxSpeed, accelerationDistance } = calculateMaxSpeed(absoluteDistance, config.MAX_SPEED, config.MIN_SPEED, config.ACCELERATION);
    const decelerationTarget = absoluteDistance - accelerationDistance;
    const KpDirection = distance > 0 ? 1 : -1;

    let speedSetpoint = maxSpeed;
    let hasPassedDecelerationTarget = false;
    let hasPassedStopTarget = false;
    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return (deltaTicks, pose) => {
      const distanceTravelled = robotlib.utils.math.calculateDistance(startPose, pose);
      let headingError = Number((heading - pose.phi).toFixed(6));

      if (headingError > Math.PI) {
        headingError -= Math.PI * 2;
      }

      if (headingError <= -Math.PI) {
        headingError += Math.PI * 2;
      }

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION_STEP);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION_STEP);

      leftSpeed += Math.round(headingError * config.HEADING_KP) * KpDirection;
      rightSpeed -= Math.round(headingError * config.HEADING_KP) * KpDirection;

      if (!hasPassedDecelerationTarget && distanceTravelled >= decelerationTarget) {
        hasPassedDecelerationTarget = true;
        speedSetpoint = config.MIN_SPEED;
      }

      if (!hasPassedStopTarget && distanceTravelled >= absoluteDistance) {
        hasPassedStopTarget = true;
        speedSetpoint = 0;
        leftSpeed = speedSetpoint;
        rightSpeed = speedSetpoint;
      }

      leftSpeed = robotlib.utils.constrain(leftSpeed, 0, maxSpeed);
      rightSpeed = robotlib.utils.constrain(rightSpeed, 0, maxSpeed);

      const leftTickSpeed = robotlib.utils.math.speedToTickSpeed(leftSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
      const rightTickSpeed = robotlib.utils.math.speedToTickSpeed(rightSpeed, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

      writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);

      if (hasPassedStopTarget) {
        resolve();
      }
    };
  };
};

module.exports = makeOnDistanceHeading;
