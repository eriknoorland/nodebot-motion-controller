const LOOP_TIME = 20; // ms
const MOTOR_ENCODER_CPR = 48; // two pin encoder rising and falling edge
const MOTOR_GEAR_RATIO = 46.85;
const NUM_TICKS_PER_REVOLUTION = MOTOR_GEAR_RATIO * MOTOR_ENCODER_CPR;
const WHEEL_BASE = 189.7; // mm
const BASE_CIRCUMFERENCE = Math.PI * WHEEL_BASE;
const LEFT_WHEEL_DIAMETER = 69.14; // mm
const LEFT_WHEEL_CIRCUMFERENCE = Math.PI * LEFT_WHEEL_DIAMETER; // mm
const LEFT_DISTANCE_PER_TICK = LEFT_WHEEL_CIRCUMFERENCE / NUM_TICKS_PER_REVOLUTION; // mm
const RIGHT_WHEEL_DIAMETER = 69.14; // mm
const RIGHT_WHEEL_CIRCUMFERENCE = Math.PI * RIGHT_WHEEL_DIAMETER; // mm
const RIGHT_DISTANCE_PER_TICK = RIGHT_WHEEL_CIRCUMFERENCE / NUM_TICKS_PER_REVOLUTION; // mm
const MIN_SPEED = 50; // mm/s
const MAX_SPEED = 400; // mm/s
const MAX_ROTATION_SPEED = MAX_SPEED / 2; // mm/s

module.exports = {
  LOOP_TIME,
  MOTOR_ENCODER_CPR,
  MOTOR_GEAR_RATIO,
  NUM_TICKS_PER_REVOLUTION,
  WHEEL_BASE,
  BASE_CIRCUMFERENCE,
  LEFT_WHEEL_DIAMETER,
  LEFT_WHEEL_CIRCUMFERENCE,
  LEFT_DISTANCE_PER_TICK,
  RIGHT_WHEEL_DIAMETER,
  RIGHT_WHEEL_CIRCUMFERENCE,
  RIGHT_DISTANCE_PER_TICK,
  MIN_SPEED,
  MAX_SPEED,
  MAX_ROTATION_SPEED,
};

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
