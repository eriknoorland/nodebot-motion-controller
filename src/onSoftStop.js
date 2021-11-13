const robotlib = require('robotlib');
const requests = require('./requests');
const slope = require('./utils/slope');

const makeOnSoftStop = (config, writeToSerialPort) => {
  return (startLeftTicks, startRightTicks, resolve) => {
    let lastLeftTicks = startLeftTicks;
    let lastRightTicks = startRightTicks;
    let leftSpeed = null;
    let rightSpeed = null;

    return ({ leftTicks, rightTicks }) => {
      const deltaLeftTicks = leftTicks - lastLeftTicks;
      const deltaRightTicks = rightTicks - lastRightTicks;

      lastLeftTicks = leftTicks;
      lastRightTicks = rightTicks;

      if (leftSpeed === null) {
        leftSpeed = Math.abs(robotlib.utils.math.tickSpeedToSpeed(deltaLeftTicks, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME));
        rightSpeed = Math.abs(robotlib.utils.math.tickSpeedToSpeed(deltaRightTicks, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME));
      }

      leftSpeed = slope(leftSpeed, 0, config.ACCELERATION_STEP);
      rightSpeed = slope(rightSpeed, 0, config.ACCELERATION_STEP);

      const leftTickSpeed = robotlib.utils.math.speedToTickSpeed(leftSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
      const rightTickSpeed = robotlib.utils.math.speedToTickSpeed(rightSpeed, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

      writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);

      if (!leftTickSpeed && !rightTickSpeed) {
        resolve();
      }
    };
  };
};

module.exports = makeOnSoftStop;
