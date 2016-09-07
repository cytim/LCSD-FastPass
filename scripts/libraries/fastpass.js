/**
 * This file should be independent of external libraries.
 */

(function(win) {
  var _fastpass = {};

  _fastpass.forecastPeriod = 11;  // include today
  _fastpass.lcsdFacilityBookingGeneralUrl = 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=1&lang=TC';
  _fastpass.lcsdFacilityBookingIndividualUrl = 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=2&lang=TC';
  _fastpass.lcsdFacilityCheckingUrl = 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=4&lang=TC';

  win.fastpass = _fastpass;
}(window));
