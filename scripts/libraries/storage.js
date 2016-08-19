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

  /**
   * A table is a database-table-like data structure. The data should be stored
   * as an array to simulate table rows. The data should also have the same
   * structure (i.e. same table columns).
   * If the data does not fit the requirement, using this module will crash the
   * system.
   */
  _storage.table = {};

  /**
   * Create a table record.
   * @param {String} tableName
   * @param {*} newRecord
   * @param {Function} [callback] - callback(newRecord)
   */
  _storage.table.create = function(tableName, newRecord, callback) {
    callback = callback || function() {};
    _storage.get(tableName, function(records) {
      records.push(newRecord);
      _storage.set(tableName, records, _.partial(callback, newRecord));
    });
  };

  /**
   * Retrieve all table record that matches the predicate.
   * All record will be returned if `predicate` is not provided.
   * @param {String} tableName
   * @param {Function} [predicate]
   * @param {Function} callback - callback(matchedRecords)
   */
  _storage.table.find = function(tableName, predicate, callback) {
    if (!callback && !predicate)
      throw new Error('Error: invalid arguments');
    _storage.get(tableName, function(records) {
      if (!callback)
        return predicate(records);
      callback(_.filter(records, predicate));
    });
  }

  /**
   * Update all table record that matches the predicate.
   * @param {String} tableName
   * @param {*} newRecord
   * @param {Function} predicate
   * @param {Function} [callback] - callback(updatedRecords, originalRecords)
   */
  _storage.table.update = function(tableName, newRecord, predicate, callback) {
    callback = callback || function() {};
    _storage.get(tableName, function(records) {
      var original = [];
      var updated  = [];
      _.forEach(records, function(record) {
        if (predicate(record)) {
          original.push(_.cloneDeep(record));
          updated.push(_.assign(record, newRecord));
        }
      });
      _storage.set(tableName, records, _.partial(callback, updated, original));
    });
  };

  /**
   * Remove all table record that matches the predicate.
   * @param {String} tableName
   * @param {Function} predicate
   * @param {Function} [callback] - callback(removedRecords)
   */
  _storage.table.remove = function(tableName, predicate, callback) {
    callback = callback || function() {};
    _storage.get(tableName, function(records) {
      var removed = _.remove(records, predicate);
      _storage.set(tableName, records, _.partial(callback, removed));
    });
  };

  win.storage = _storage;
}(window));
