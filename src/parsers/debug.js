const robotlib = require('robotlib');

const parseDecToBinary = robotlib.utils.math.parseDecToBinary;

/**
 *
 * @param {Array} data
 * @return {Object}
 */
const debug = data => {
  const loopTime = data[0];

  const left = {
    speedSetpoint: data[1],
    speedTicksInput: data[2],
    speedPwmOutput: parseInt(`${parseDecToBinary(data[3])}${parseDecToBinary(data[4])}`, 2),
    totalTicks: parseInt(`${parseDecToBinary(data[5])}${parseDecToBinary(data[6])}`, 2),
  };

  const right = {
    speedSetpoint: data[7],
    speedTicksInput: data[8],
    speedPwmOutput: parseInt(`${parseDecToBinary(data[9])}${parseDecToBinary(data[10])}`, 2),
    totalTicks: parseInt(`${parseDecToBinary(data[11])}${parseDecToBinary(data[12])}`, 2),
  };

  return {
    loopTime,
    left,
    right,
  };
};

module.exports = debug;
