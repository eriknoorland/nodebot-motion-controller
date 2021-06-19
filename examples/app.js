const MotionController = require('../src/motionController');
const config = require('./config');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

async function init() {
  await motionController.init();
  await motionController.distanceHeading(1000, 0);
  await motionController.close();
}

init();
