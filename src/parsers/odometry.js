/**
 *
 * @param {Array} data
 * @return {Object}
 */
const odometry = data => {
  const leftDirection = data[1] || -1;
  const rightDirection = !data[3] ? 1 : -1;
  const leftTicks = data[0] * leftDirection;
  const rightTicks = data[2] * rightDirection;

  return {
    leftTicks,
    rightTicks,
    left: {
      ticks: leftTicks,
      direction: leftDirection,
    },
    right: {
      ticks: rightTicks,
      direction: rightDirection,
    },
  };
};

module.exports = odometry;
