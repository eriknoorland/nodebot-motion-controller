const calculateAccelerationTime = (targetSpeed, currentSpeed, acceleration) => {
  const extraTimeOffset = 0.1;
  const time = ((targetSpeed - currentSpeed) / acceleration);

  return time + extraTimeOffset;
};

module.exports = calculateAccelerationTime;