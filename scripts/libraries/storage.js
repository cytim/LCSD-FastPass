/**
 * A wrapper for Chrome Storage API
 * Only `get` and `set` methods are implemented because the other methods are dangerous
 * to use and are rarely used.
 */
(function(win) {
  var _storage = {};
  var _source  = _storage.source = chrome.storage.local;

  /**
   * Reference: https://developer.chrome.com/extensions/storage#type-StorageArea
   * @param {String} key - Unlike the Chrome Storage API, it only accepts string input.
   * @param {Function} callback - return the value of the matched key
   */
  _storage.get = function(key, callback) {
    if (typeof key !== 'string')
      throw new Error('`key` should be a string');
    if (!callback)
      return;
    _source.get(key, function(store) {
      if (store instanceof Error) throw store;
      callback(store[key]);
    });
  };

  /**
   * Reference: https://developer.chrome.com/extensions/storage#type-StorageArea
   * @param {String} key - Unlike the Chrome Storage API, it only accepts string input.
   * @param {*} value
   * @param {Function} callback
   */
  _storage.set = function(key, value, callback) {
    if (typeof key !== 'string')
      throw new Error('`key` should be a string');
    var update = {};
    update[key] = value;
    _source.set(update, function(err) {
      if (err instanceof Error) throw err;
      callback && callback();
    });
  };

  win.storage = _storage;
}(window));
