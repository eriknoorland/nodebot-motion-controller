const calculateSpeed = ({ leftTicks, rightTicks }) => {
  const currentLeftTickSpeed = robotlib.utils.math.tickSpeedToSpeed(leftTicks, config.LEFT_DISTANCE_PER_TICK, config.LOOP_TIME);
  const currentRightTickSpeed = robotlib.utils.math.tickSpeedToSpeed(rightTicks, config.RIGHT_DISTANCE_PER_TICK, config.LOOP_TIME);

  return (currentLeftTickSpeed + currentRightTickSpeed) * 0.5;
}

module.exports = calculateSpeed;