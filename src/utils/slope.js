/**
 * Linear slope to setpoint
 * @param {Number} input
 * @param {Number} setpoint
 * @param {Number} step
 * @returns {Number}
 */
 const slope = (input, setpoint, step) => {
  if (input < setpoint) {
    return Math.min(input += step, setpoint);
  }

  return Math.max(input -= step, setpoint);
};

module.exports = slope;