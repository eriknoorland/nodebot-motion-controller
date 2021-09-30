const robotlib = require('robotlib');
const requests = require('./requests');
const motorDirections = require('./motorDirections');
const slope = require('./utils/slope');

const makeOnSpeedHeading = (config, writeToSerialPort) => {
  return (speed, heading, callback, resolve) => {
    const isForward = speed > 0;
    const speedSetpoint = speed - (10 * (isForward ? 1 : -1));
    const direction = isForward ? motorDirections.FORWARD : motorDirections.REVERSE;
    const KpDirection = isForward ? 1 : -1;

    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return (deltaTicks, pose) => {
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

      leftSpeed = robotlib.utils.constrain(leftSpeed, 0, speed);
      rightSpeed = robotlib.utils.constrain(rightSpeed, 0, speed);

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
