const calculateAccelerationTime = require('./calculateAccelerationTime');

const calculateAccelerationDistance = (targetSpeed, currentSpeed, acceleration) => {
  const time = calculateAccelerationTime(targetSpeed, currentSpeed, acceleration);
  const distance = Math.ceil(0.5 * (acceleration * Math.pow(time, 2)));

  return distance;
};

module.exports = calculateAccelerationDistance;