const MotionController = require('../src/motionController');
const config = require('../examples/config');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

// TESTS

// wheel diameter difference test
// 1. drive 1m straight and measure deviation to either left or right (repeat 10 times and take average)
// 2. swap wheels and repeat test 1
// 3. swap motors and repeat test 1?
// 4. take conclusion based on outcome?

// wheel base error
// 1. spin x amount of circles
// 2. tweak wheel base based on deviation
// 3. repeat step 1

// UMBMark
// 1. squares

function init() {
  motionController.init()
    .then(onMotionControllerInitialized)
    .catch((error) => {
      console.log(error);
      process.exit();
    });
}

function onMotionControllerInitialized() {
  // FIXME, set after solving start vector
  // motionController.appendPose({ x: 170, y: 210, phi: 0 });

  // motionController.on('odometry', console.log);
  // motionController.on('pose', console.log);
  // motionController.on('speed', console.log);

  // TEST
  motionController.distanceHeading(500, 0)
    .then(motionController.close);

  // motionController.rotate(-(Math.PI / 2))
    // .then(() => motionController.rotate(Math.PI / 2))
    // .then(() => motionController.rotate(-(Math.PI / 2)))
    // .then(motionController.close);

  // setTimeout(() => {
  //   motionController.stop(true)
  //     .then(motionController.close);
  // }, 5000);

  // motionController.move2XY({ x: 100, y: -100 })
  //   .then(motionController.close);

  // wheelDiameterTest(1000).then(motionController.close);
  // wheelBaseTest(1, -1).then(motionController.close);
  // square(100).then(motionController.close);
  // testHighLevelMotionFunctions(200).then(motionController.close);
}

/**
 * Wheel diameter test
 * @param {Number} distance
 * @return {Promise}
 */
function wheelDiameterTest(distance) {
  let accLeftTicks = 0;
  let accRightTicks = 0;

  motionController.on('pose', console.log);

  motionController.on('odometry', ({ leftTicks, rightTicks }) => {
    accLeftTicks += leftTicks;
    accRightTicks += rightTicks;

    console.log({
      leftDistance: (accLeftTicks * config.LEFT_DISTANCE_PER_TICK).toFixed(2),
      rightDistance: (accRightTicks * config.RIGHT_DISTANCE_PER_TICK).toFixed(2),
    });
  });

  return new Promise(resolve => {
    motionController.distanceHeading(distance, 0)
      .then(resolve);
  });
}

/**
 * Wheel base test
 * @param {Number} numRotations
 * @param {Number} direction
 * @return {Promise}
 */
function wheelBaseTest(numRotations, direction = 1) {
  // motionController.on('pose', console.log);

  return motionController.rotate((Math.PI * numRotations) * direction);
}

/**
 * Square driving test
 * @param {Number} distance
 * @return {Promise}
 */
function square(distance) {
  motionController.on('pose', console.log);

  return new Promise(resolve => {
    motionController.distanceHeading(distance, 0)
      .then(() => motionController.rotate(-Math.PI / 2))
      .then(() => motionController.distanceHeading(distance, 0))
      .then(() => motionController.rotate(-Math.PI / 2))
      .then(() => motionController.distanceHeading(distance, 0))
      .then(() => motionController.rotate(-Math.PI / 2))
      .then(() => motionController.distanceHeading(distance, 0))
      .then(() => motionController.rotate(-Math.PI / 2))
      // OR
      // .then(() => motionController.move2XYPhi({ x: distance, y: 0 }, Math.PI / 2))
      // .then(() => motionController.move2XYPhi({ x: distance, y: distance }, Math.PI))
      // .then(() => motionController.move2XYPhi({ x: 0, y: distance }, -(Math.PI / 2)))
      // .then(() => motionController.move2XYPhi({ x: 0, y: 0 }, 0))
      .then(resolve);
  });
}

/**
 * Test high level motion functions
 * @param {Number} distance
 * @return {Promise}
 */
async function testHighLevelMotionFunctions(distance) {
  motionController.on('pose', console.log);

  await motionController.move2XY({ x: distance, y: 0 });
  await motionController.move2XYPhi({ x: distance, y: -distance }, -Math.PI);

  return Promise.resolve();
}

init();
