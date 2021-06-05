const MotionController = require('../src/motionController');
const config = require('./config');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

function init() {
  motionController.init()
    .then(onMotionControllerInitialized);
}

function onMotionControllerInitialized() {
  motionController.on('pose', console.log);

  let doStop = false;

  setTimeout(() => { doStop = true }, 2000);

  motionController.speedHeading(400, 0, () => doStop)
    .then(motionController.stop);
  // motionController.distanceHeading(500, 0)
  // motionController.rotate(-(Math.PI / 2))
    // .then(motionController.close);

    setTimeout(() => {
      motionController.stop(true)
        .then(motionController.close);
    }, 5000);
}

init();
