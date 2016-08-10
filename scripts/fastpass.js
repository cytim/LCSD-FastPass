/**
 * This file should be independent of external libraries.
 */

(function(win) {
  var _fastpass = {};

  _fastpass.forecastPeriod = 10;
  _fastpass.lcsdFacilityCheckingUrl = 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=4&lang=TC';

  /**
   * A wrapper for Chrome Storage API
   * Only `get` and `set` methods are implemented because the other methods are dangerous
   * to use and are rarely used.
   */
  _fastpass.storage = {
    source: chrome.storage.local,

    /**
     * Reference: https://developer.chrome.com/extensions/storage#type-StorageArea
     * @param {String} key - Unlike the Chrome Storage API, it only accepts string input.
     * @param {Function} callback - return the value of the matched key
     */
    get: function(key, callback) {
      if (typeof key !== 'string')
        throw new Error('`key` should be a string');
      if (!callback)
        return;
      this.source.get(key, function(store) {
        if (store instanceof Error) throw store;
        callback(store[key]);
      });
    },

    /**
     * Reference: https://developer.chrome.com/extensions/storage#type-StorageArea
     * @param {String} key - Unlike the Chrome Storage API, it only accepts string input.
     * @param {*} value
     * @param {Function} callback
     */
    set: function(key, value, callback) {
      if (typeof key !== 'string')
        throw new Error('`key` should be a string');
      var update = {};
      update[key] = value;
      this.source.set(update, function(err) {
        if (err instanceof Error) throw err;
        callback && callback();
      });
    }
  };

  win.fastpass = _fastpass;
}(window));
