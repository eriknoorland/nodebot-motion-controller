const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const config = require('../examples/config');
const MotionController = require('../index');
const motionController = MotionController('/dev/tty.usbmodem82403301', config);

function init() {
  motionController.init()
    .then(onMotionControllerInitialized);
}

function onMotionControllerInitialized() {
  motionController.setDebugLevel(1);
  motionController.on('debug', data => io.emit('debug', data));
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/main.js', (req, res) => {
  res.sendFile(__dirname + '/main.js');
});

io.on('connection', socket => {
  socket.on('action', ({ method, params }) => {
    try {
      motionController[method].apply(null, params);
    } catch(error) {
      console.log(error, method);
    }
  });
});

http.listen(3000, init);
