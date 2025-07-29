/**
 * Created by montymccune on 12/15/15.
 */
// import * as noty from 'needim/noty/js/noty/packaged/jquery.noty.packaged.js';
//import * as noty from 'noty';
//  import moment from '../../node_modules/moment/moment';
import moment from 'moment';
// import {inject} from 'aurelia-framework';

//@inject()/
export class helper {

  _prepender = '';  //settings.api.prepender;
  _server = 'https://phoenixservices20250215203954.azurewebsites.net/';//change
  _webDocsServer = 'https://lively-water-016adb510.6.azurestaticapps.net/';//change
  _user;//yecded
  tenantId;
  goFileUrl;
  imageTenantRoot;
  imageTenantBaseUrl;

  buildNumber = '2.89.00';

  constructor() {
    console.log("HELPER");
    let self = this;
    self.tenantId = 'laorthowellness-com';
    self.goFileUrl = 'https://phoenixprodblob.blob.core.windows.net/';
    self.imageTenantRoot = `${self.tenantId}/images/`;
    self.imageTenantBaseUrl = `${self.goFileUrl}${self.imageTenantRoot}`;
  }

  // getWindowWidthHeight(){
  //   const windowHeight = window.innerHeight;
  //   const windowWidth = window.innerWidth;
  // }

  getApiUrl(resource) {
    let base = this._server;
    if (!base.endsWith('/')) base += '/';
    if (resource.startsWith('/')) resource = resource.substring(1);
    return base + this._prepender + resource;
  }

  getFilewatcherUrl(resource) {
    return this._server + '/filewatcher/' + resource;
  }

  isStringNullOrEmpty(string) {
    if (string == null || string == "") {
      return true;
    }
    return false;
  }

  is_today(date) {
    var today = new Date();
    var schedule_date = new Date(date);
    if (today.getFullYear() == schedule_date.getFullYear() &&
      today.getDate() == schedule_date.getDate() &&
      today.getMonth() == schedule_date.getMonth()) {
      return true;
    } else {
      return false;
    }
  }

  getMMDDYYYYDate(year, month, day, divider) {

    var div = divider == undefined ? '-' : divider;

    month += 1;

    var tMonth = "";
    if (month.toString().length == 1) {
      tMonth = "0" + month;
    } else {
      tMonth = month;
    }

    var tDay = "";
    if (day.toString().length == 1) {
      tDay = "0" + day;
    } else {
      tDay = day;
    }

    return `${tMonth}${div}${tDay}${div}${year}`;
  }

  utcDateToTimeString(utcDate) {
    var date = new Date(utcDate)
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    var options = {
      timeStyle: "short",
      timeZone: tz,
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  parseMMDDYYDateString(date, divider) {
    var split = date.split(divider);
    var month = parseInt(split[0]);
    month = month - 1;//zero-based...
    var day = parseInt(split[1]);
    var year = parseInt(split[2]);
    return new Date(year, month, day);//, 0, 0);
  }

  parseSimpleDate(date, format) {
    var frmtUpper = format.toUpperCase();

    //find divider...
    var divider = null;
    for (var i = 0; i < frmtUpper.length; i++) {
      var char = frmtUpper.substring(i, i + 1)
      if (char == '-' || char == '/') {
        divider = char;
        break;
      }
    }

    //no format??? try getting from date...
    for (var d = 0; d < date.length; d++) {
      var char = date.substring(d, d + 1)
      if (char == " ") continue;
      var pInt = parseInt(char);
      if (isNaN(pInt)) {
        divider = char;
        break;
      }
    }

    if (divider == null) return null;

    var split = date.split(divider);
    var splitFrmt = format.split(divider);

    var month, day, year = null;

    //determine the date components...
    for (var d = 0; d < splitFrmt.length; d++) {
      if (splitFrmt[d] == 'M' || splitFrmt[d] == 'MM') {
        month = parseInt(split[d]);
        month = month - 1;//zero-based...
      } else if (splitFrmt[d] == 'D' || splitFrmt[d] == 'DD') {
        day = parseInt(split[d]);
      } else if (splitFrmt[d].startsWith('Y')) {

        //check for two-digit year...
        if (split[d].length == 2) {
          //assume current millenia...   
          var today = new Date();
          var fullyear = today.getFullYear().toString();
          fullyear = fullyear.substring(0, 2) + split[d];
          year = parseInt(fullyear);
        } else {
          year = parseInt(split[d]);
        }
      }
    }

    if (month == null || day == null || year == null) {
      return null;
    }

    return new Date(year, month, day);
  }

  getMMDDYYYYDateWithDate(date, divider) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var day = date.getDate();
    return this.getMMDDYYYYDate(year, month, day, divider);
  }

  getMMDDYYYYDate(year, month, day, divider) {

    var div = divider == undefined ? '-' : divider;

    var tMonth = "";
    //add 1 to month...
    month += 1;
    if (month.toString().length == 1) {
      tMonth = "0" + month;
    } else {
      tMonth = month.toString();
    }

    var tDay = "";
    if (day.toString().length == 1) {
      tDay = "0" + day;
    } else {
      tDay = day;
    }

    return `${tMonth}${div}${tDay}${div}${year.toString()}`;
  }

  getMMDDYYDate(year, month, day, divider) {

    var div = divider == undefined ? '-' : divider;

    var tMonth = "";
    month += 1;
    if (month.toString().length == 1) {
      tMonth = "0" + (month);
    } else {
      tMonth = month;
    }

    var tDay = "";
    if (day.toString().length == 1) {
      tDay = "0" + day;
    } else {
      tDay = day;
    }

    var twoDigitYear = year.toString().substring(2);

    return `${tMonth}${div}${tDay}${div}${twoDigitYear}`;
  }

  createNoty(description, timeout, layout) {
    return new Noty({
      text: '<i class="fa fa-circle-o-notch fa-spin"></i> ' + description,
      layout: layout ? layout : 'bottomRight',
      type: 'alert',
      timeout: timeout
    });
  }

  createNotySuccess(message) {
    let n = new Noty({
      text: message,
      layout: 'bottomRight',
      type: 'success',
      timeout: 1000
    });
    n.show();
  }

  updateNoty(noty, text, type, millisecsToClose) {
    if (text) {
      noty.setText(text);
    }
    if (type) {
      noty.setType(type);
    }

    if (millisecsToClose) {
      this.closeNotyTimed(noty, millisecsToClose);
    }
  }

  closeNotyTimed(noty, millseconds) {
    var timer = window.setTimeout(function () {
      window.clearTimeout(timer);
      noty.close();
    }, millseconds);
  }

  notySuccess(n, message) {
    n.setText(message);
    n.setType('success');
  }

  notyError(n, message) {
    n.setText(message);
    n.setType('error');
  }

  getDateWithFormat(date, format) {
    return moment(date, "MM/DD/YYYY").format(format);
  }

  getISODateToFormat(date, format) {
    return moment(date, moment.ISO_8601).format(format);
  }

  processToken(token, callback) {
    var splitToken = token.split('.');
    var payloadString = splitToken[1];
    var payload = atob(payloadString);

    //update the apiKey for future calls
    this._user = JSON.parse(payload);
    //adding of modern role data...
    if (this._user.RoleJson)
      this._user.RoleDetails = JSON.parse(this._user.RoleJson);
    this._jwt = token;
    if (callback) {
      callback()
    }
  }

  openToken(token) {
    var splitToken = token.split('.');
    var payloadString = splitToken[1];
    var payload = atob(payloadString);
    return JSON.parse(payload);
  }

  jwt() {
    if (this._jwt) {
      this._jwt = this._jwt.replace(/%22/g, "");
    }
    return this._jwt
  }

  getBoundObject() {
    let bridge = undefined;
    if (typeof bound === 'undefined') {
      if (chrome && chrome.webview && chrome.webview.hostObjects) {
        bridge = chrome.webview.hostObjects.bound;
        console.log('bridge from chrome.webview.hostObjects:', bridge);
        console.log('chrome', chrome);
      }
    } else {
      bridge = bound;
    }
    return bridge;
  }

  getTenantIdDashed(tenantId) {
    return tenantId.replace(".", "-");
  }
}


