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
   * Reference to _storage.table._operator.create
   */
  _storage.table.create = function(tableName, newRecord, callback) {
    _storage.table._queue.addTask({
      action: 'create',
      tableName: tableName,
      argv: [newRecord, callback]
    });
  };

  /**
   * Reference to _storage.table._operator.find
   */
  _storage.table.find = function(tableName, predicate, callback) {
    if (!callback) {
      callback = predicate;
      predicate = undefined;
    }
    _storage.table._queue.addTask({
      action: 'find',
      tableName: tableName,
      argv: [predicate, callback]
    });
  };

  /**
   * Reference to _storage.table._operator.update
   */
  _storage.table.update = function(tableName, newRecord, predicate, callback) {
    _storage.table._queue.addTask({
      action: 'update',
      tableName: tableName,
      argv: [newRecord, predicate, callback]
    });
  };

  /**
   * Reference to _storage.table._operator.remove
   */
  _storage.table.remove = function(tableName, predicate, callback) {
    _storage.table._queue.addTask({
      action: 'remove',
      tableName: tableName,
      argv: [predicate, callback]
    });
  };

  /**
   * A queue to control the CRUD operation on a table.
   * The table is locked when any task is taking action. Subsequence query to
   * the same table will be queued and execute as soon as the current task
   * completes.
   *
   * The goal of this implementation is to guarantee data integrity within a
   * page. For example, two subsequence `create` operation is guaranteed not to
   * overwrite each other.
   *
   * IMPORTANT:
   * 1.  If more than one `storage` instance is loaded, or Chrome storage is
   *     manipulated outside the `storage.table` instance, the data may corrupt
   *     unexpectedly.
   * 2.  Queued tasks will be abandoned when user closes the page before the
   *     tasks are executed.
   * 3.  The above issues could be minimized if the implmentation is moved to
   *     a persistent background page, which may be deprecated by Google very
   *     soon. This may also be over-engineered as a Chrome Extension.
   */
  _storage.table._queue = {};
  Object.defineProperties(_storage.table._queue, {
    _push: {
      value: function(task) {
        this[task.tableName] = this[task.tableName] || [];
        return this[task.tableName].push(task);
      }
    },

    _shift: {
      value: function(task) {
        this[task.tableName] = this[task.tableName] || [];
        this[task.tableName].shift();
        return this[task.tableName].length;
      }
    },

    _executeTask: {
      value: function(task) {
        var _this    = this;
        var argv     = _.clone(task.argv);
        var callback = argv.pop() || function() {};
        var newCallback = function() {
          if (_this._shift(task)) {
            _this._executeTask(_this[task.tableName][0]);
          }
          callback.apply(null, arguments);
        };
        argv.push(newCallback);
        argv.unshift(task.tableName);
        _storage.table._operator[task.action].apply(_storage.table, argv);
      }
    },

    addTask: {
      value: function(task) {
        if (this._push(task) === 1)
          this._executeTask(task);
      }
    }
  });

  _storage.table._operator = {};

  /**
   * Create a table record.
   * @param {String} tableName
   * @param {*} newRecord
   * @param {Function} [callback] - callback(newRecord)
   */
  _storage.table._operator.create = function(tableName, newRecord, callback) {
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
  _storage.table._operator.find = function(tableName, predicate, callback) {
    predicate = predicate || _.identity;
    _storage.get(tableName, function(records) {
      callback(_.filter(records, predicate));
    });
  };

  /**
   * Update all table record that matches the predicate.
   * @param {String} tableName
   * @param {*} newRecord
   * @param {Function} predicate
   * @param {Function} [callback] - callback(updatedRecords, originalRecords)
   */
  _storage.table._operator.update = function(tableName, newRecord, predicate, callback) {
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
  _storage.table._operator.remove = function(tableName, predicate, callback) {
    callback = callback || function() {};
    _storage.get(tableName, function(records) {
      var removed = _.remove(records, predicate);
      _storage.set(tableName, records, _.partial(callback, removed));
    });
  };

  win.storage = _storage;
}(window));
