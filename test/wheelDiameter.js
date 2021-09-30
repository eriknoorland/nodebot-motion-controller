const MotionController = require('../src/motionController');
const config = require('../examples/config');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

async function init() {
  await motionController.init();
  await motionController.distanceCalibrationTest(3000);
  await motionController.close();
}

init();
