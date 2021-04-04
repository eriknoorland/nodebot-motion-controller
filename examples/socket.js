const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const robotlib = require('./robotlib');

const MotionController = require('./motionController');
const motionController = MotionController('/dev/tty.usbmodem62586801');

/**
 * init
 */
function init() {

}

/**
 * motion controller initialized event handler
 */
function onMotionControllerInitialized() {
  motionController.setTrackPose(true);

  // FIXME, set after solving start vector
  // motionController.appendPose({ x: 170, y: 210, phi: 0 });

  // motionController.on('odometry', console.log);
  // motionController.on('pose', console.log);
  // motionController.on('speed', console.log);

  motionController.on('speed', data => {
    io.emit('speed', data);
  });

  // TEST
  // motionController.distanceHeading(1000, 0)
  //   .then(motionController.close);

  motionController.rotate(0)
    .then(motionController.close);
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  motionController.init()
    .then(onMotionControllerInitialized);
});

http.listen(3000, init);
