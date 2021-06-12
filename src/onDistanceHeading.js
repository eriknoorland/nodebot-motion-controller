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

    let speedSetpoint = maxSpeed;
    let isAtDecelerationTarget = false;
    let isAtStopTarget = false;
    let leftSpeed = 0;
    let rightSpeed = 0;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);

    return (deltaTicks, pose) => {
      const distanceTravelled = robotlib.utils.math.calculateDistance(startPose, pose);

      leftSpeed = slope(leftSpeed, speedSetpoint, config.ACCELERATION);
      rightSpeed = slope(rightSpeed, speedSetpoint, config.ACCELERATION);

      // FIXME are we moving in a "straight" line (heading)?
      // const headingDiff = startPose.phi {something} pose.phi;
      // adjust left and right speeds accordingly (PID?)

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

/*
function distanceHeading(distance, heading) {
  return new Promise(resolve => {
    const absoluteDistance = Math.abs(distance);
    const startPose = getPose();
    const { speed: maxSpeed, acc } = calculateMaxSpeed(absoluteDistance, config.MAX_SPEED, config.MIN_SPEED);
    const decelerationDistance = 0.5 * (maxSpeed - config.MIN_SPEED);
    const slowDistance = 2 * config.MIN_SPEED;
    const decelerationTarget = absoluteDistance - (slowDistance + decelerationDistance);
    const hasAcceleration = acc > 1;
    const direction = distance > 0 ? FORWARD : REVERSE;

    writeToSerialPort([requests.START_FLAG, requests.SET_DIRECTION, ...direction]);
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
        update: ({ pose }) => robotlib.utils.math.calculateDistance(startPose, pose) >= absoluteDistance,
        complete: () => stop(true).then(resolve),
      }));
  });
}
*/

/*
function onOdometryData(data) {
  const pose = calculatePose(poses[poses.length - 1], data);
  const targetSpeed = robotlib.utils.math.fixedDecimals(speedRamp.update() || 0, 2);
  const tickSpeed = robotlib.utils.math.speedToTickSpeed(targetSpeed, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);

  let leftTickSpeed = tickSpeed;
  let rightTickSpeed = tickSpeed;

  eventEmitter.emit('odometry', data);

  if (motionTargets.length) {
    const motionTarget = motionTargets[0];
    motionTarget.init();

    const result = motionTarget.update({ ...data, pose });

    if (result === true) {
      motionTarget.complete();
      motionTargets.shift();
    }
  }

  writeToSerialPort([requests.START_FLAG, requests.SET_SPEED, leftTickSpeed, rightTickSpeed]);
}
*/