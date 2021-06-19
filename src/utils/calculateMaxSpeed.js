const calculateMaxSpeed = (distance, desiredSpeed, minSpeed) => {
  if (distance <= minSpeed * 2) {
    return minSpeed;
  }

  const accDistance = desiredSpeed * 0.5;
  const decDistance = (desiredSpeed - minSpeed) * 0.5;
  const stopDistance = minSpeed;

  if (accDistance + decDistance + stopDistance > distance) {
    return calculateMaxSpeed(distance, desiredSpeed - 25);
  }

  return desiredSpeed;
};

module.exports = calculateMaxSpeed;