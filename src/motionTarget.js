/**
 * motionTarget
 * @param {String} name
 * @param {Object} userSettings
 * @return {Object}
 */
const motionTarget = (name, userSettings) => {
  const settings = {
    init: () => {},
    update: () => {},
    complete: () => {},
    ...userSettings,
  };

  let isInitialized = false;
  let isCompleted = false;

  /**
   * Constructor
   */
  function constructor() {
    // console.log(`${name}:created`);
  }

  /**
   * Init
   */
  function init() {
    if (!isInitialized) {
      // console.log(`${name}:init`);
      settings.init();
    }

    isInitialized = true;
  }

  /**
   * Update
   */
  function update(data) {
    return !!settings.update(data);
  }

  /**
   * Complete
   */
  function complete() {
    if (!isCompleted) {
      // console.log(`${name}:complete`);
      settings.complete();
    }

    isCompleted = true;
  }

  constructor();

  return {
    init,
    update,
    complete,
  };
};

module.exports = motionTarget;
