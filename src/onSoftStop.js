const robotlib = require('robotlib');
const requests = require('./requests');
const slope = require('./utils/slope');

const makeOnSoftStop = (config, writeToSerialPort) => {
  return (resolve) => {
    let leftSpeed = null;
    let rightSpeed = null;

    return ({ leftTicks, rightTicks }) => {
      if (leftSpeed === null) {
        leftSpeed = robotlib.utils.math.tickSpeedToSpeed(leftTicks, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
        rightSpeed = robotlib.utils.math.tickSpeedToSpeed(rightTicks, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);
      }

      leftSpeed = slope(leftSpeed, 0, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, 0, config.ACCELERATION);

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
