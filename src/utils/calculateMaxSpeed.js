const calculateAccelerationDistance = require('./calculateAccelerationDistance');

const calculateMaxSpeed = (distance, maxSpeed, minSpeed, acceleration) => {
  if (distance <= minSpeed * 2) {
    return {
      maxSpeed: minSpeed,
      accelerationDistance: 0,
    };
  }

  const accelerationDistance = calculateAccelerationDistance(maxSpeed, 0, acceleration);

  if (accelerationDistance * 2 > distance) {
    return calculateMaxSpeed(distance, maxSpeed - (minSpeed / 2), minSpeed, acceleration);
  }

  return {
    maxSpeed,
    accelerationDistance,
  };
};

module.exports = calculateMaxSpeed;