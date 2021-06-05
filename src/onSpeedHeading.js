const robotlib = require('robotlib');
const slope = require('./utils/slope');
const requests = require('./requests');
const motorDirections = require('./motorDirections');

const makeOnSpeedHeading = (config, writeToSerialPort) => {
  return (speedSetpoint, heading, callback, resolve) => {
    const direction = speedSetpoint > 0 ? motorDirections.FORWARD : motorDirections.REVERSE;

    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return () => {
      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      // FIXME are we moving in a "straight" line (heading)?
      // const headingDiff = startPose.phi {something} pose.phi;
      // adjust left and right speeds accordingly (PID?)

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

// return new Promise(resolve => {
//   const direction = speed > 0 ? motorDirections.FORWARD : motorDirections.REVERSE;

//   if (speed > config.MAX_SPEED) {
//     speed = config.MAX_SPEED;
//   }

//   writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);
//   speedRamp = new Ramp();

//   motionTargets.push(
//     motionTarget('speedHeading:start', {
//       init: () => speedRamp.go(speed, 1000, accelerationMode, 'ONCEFORWARD'),
//       update: callback,
//     }));

//   motionTargets.push(
//     motionTarget('speedHeading:decelerate', {
//       init: () => speedRamp.go(0, 1000, accelerationMode, 'ONCEFORWARD'),
//       update: ({ leftTicks, rightTicks }) => !leftTicks && !rightTicks,
//       complete: () => stop(true).then(resolve),
//     }));
// });