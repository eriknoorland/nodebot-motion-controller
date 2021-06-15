const robotlib = require('robotlib');
const requests = require('./requests');
const motorDirections = require('./motorDirections');
const slope = require('./utils/slope');

const makeOnSpeedHeading = (config, writeToSerialPort) => {
  return (speedSetpoint, heading, callback, resolve) => {
    const direction = speedSetpoint > 0 ? motorDirections.FORWARD : motorDirections.REVERSE;
    const Kp = 125;

    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return (deltaTicks, pose) => {
      const headingError = heading - pose.phi;

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      leftSpeed += Math.round(headingError * Kp);
      rightSpeed -= Math.round(headingError * Kp);

      const leftTickSpeed = robotlib.utils.math.speedToTickSpeed(leftSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
      const rightTickSpeed = robotlib.utils.math.speedToTickSpeed(rightSpeed, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

      writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);

      if (callback()) {
        resolve();
      }
    };
  };
};

module.exports = makeOnSpeedHeading;
