const MotionController = require('../src/motionController');
const config = require('./config');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

function init() {
  motionController.init()
    .then(onMotionControllerInitialized);
}

function onMotionControllerInitialized() {
  motionController.setTrackPose(true);
  motionController.on('pose', console.log);

  motionController.distanceHeading(500, 0)
    .then(motionController.close);
}

init();
