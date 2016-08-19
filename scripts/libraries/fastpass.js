/**
 * This file should be independent of external libraries.
 */

(function(win) {
  var _fastpass = {};

  _fastpass.forecastPeriod = 11;  // include today
  _fastpass.lcsdFacilityCheckingUrl = 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=4&lang=TC';

  win.fastpass = _fastpass;
}(window));
