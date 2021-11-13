const robotlib = require('robotlib');

const parseDecToBinary = robotlib.utils.math.parseDecToBinary;

/**
 *
 * @param {Array} data
 * @return {Object}
 */
const odometry = data => {
  const leftTicks = parseInt([
    parseDecToBinary(data[0]),
    parseDecToBinary(data[1]),
    parseDecToBinary(data[2]),
    parseDecToBinary(data[3]),
  ].join(''), 2);

  const rightTicks = parseInt([
    parseDecToBinary(data[4]),
    parseDecToBinary(data[5]),
    parseDecToBinary(data[6]),
    parseDecToBinary(data[7]),
  ].join(''), 2);

  return {
    leftTicks,
    rightTicks,
  };
};

module.exports = odometry;
