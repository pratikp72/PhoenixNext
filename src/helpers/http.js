/**
 * Created by tylerjones on 2/20/14.
 */

import {inject} from 'aurelia-framework';
//import $ from 'jquery';
import {helper} from './helper';
//import {HttpClient as FetchClient} from 'aurelia-fetch-client';
//import {EventAggregator} from 'aurelia-event-aggregator';

@inject(helper)
export class http {

  constructor(helper){
    this.helper = helper;
    let self = this;

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          // Typical action to be performed when the document is ready:
          var config = JSON.parse(this.response);
          var server = config === null ? null : config.server;
          self.helper._server = server;
          self.helper._webDocsServer = config.webdocsServer;
        }
    };
    xhttp.open("GET", "/phxConfig.json", true);
    xhttp.send();

  }

  login(loginUrl, model, callback, errCallback){
      let self = this;
      let content = JSON.stringify({username: model.Username, password: model.Password, tenantid: model.TenantId});
      // let loginUrl = self.helper.getApiUrl('login');
      console.log('BOUT TO LOGIN!', loginUrl);
	  $.ajax({
		  type: 'POST',
		  url: loginUrl,
		  data: content,
		  contentType: 'application/json'
	  })
	  .done((data) => {
	      console.log('RECEIVED LOGIN DATA!', data);
	      if(data != "User not found."){
          self.helper.processToken(data);
        }
		  callback(data);
	  })
	  .fail(function(data) {
		  errCallback(data);
	  });
  }

  loginOdgo(loginUrl, model, callback, errCallback){
    let self = this;
    let content = JSON.stringify({username: model.Username, password: model.Password, tenantid: model.TenantId});
    // let loginUrl = self.helper.getApiUrl('login');
    console.log('BOUT TO LOGIN!', loginUrl);
  $.ajax({
    type: 'POST',
    url: loginUrl,
    data: content,
    contentType: 'application/json'
  })
  .done((data) => {
      // console.log('RECEIVED LOGIN DATA!', data);
      // if(data != "User not found."){
      //   self.helper.processToken(data);
      // }
    callback(data);
  })
  .fail(function(data) {
    errCallback(data);
  });
}

  post(url, sendData, callback, config, errCallback, postStartedCallback) {

    var _this = this;

    var tCache = true;
    var tProcessData= true;
    var tContentType = 'application/x-www-form-urlencoded; charset=UTF-8';
    if(config){
      if(config.cache != null){
        tCache = config.cache == false ? false : true;
      }
      if(config.processData != null){
        tProcessData = config.processData == false ? false : true;
      }

      tContentType = config.contentType != null ? config.contentType : tContentType;
    }

    $.ajax({
        type: 'POST',
        url: url,
        data: sendData,
        dataType: 'json',
        cache: tCache,
        processData: tProcessData,
        contentType: tContentType,
        beforeSend: function(request){
          request.setRequestHeader("Authorization-Token", _this.helper.jwt());
          if(postStartedCallback){
            postStartedCallback();
          }
        }
      })
      .done(function(data) {
          console.log('DONE POSTING', data);
        callback(data);
      })
      .fail(function(data) {
        errCallback(data);
      });
  }

  postNoAuth(url, sendData, callback, config, errCallback, postStartedCallback) {

    var _this = this;

    var tCache = true;
    var tProcessData= true;
    var tContentType = 'application/x-www-form-urlencoded; charset=UTF-8';
    if(config){
      if(config.cache != null){
        tCache = config.cache == false ? false : true;
      }
      if(config.processData != null){
        tProcessData = config.processData == false ? false : true;
      }

      tContentType = config.contentType != null ? config.contentType : tContentType;
    }

    $.ajax({
        type: 'POST',
        url: url,
        data: sendData,
        dataType: 'json',
        cache: tCache,
        processData: tProcessData,
        contentType: tContentType
      })
      .done(function(data) {
          console.log('DONE POSTING', data);
        callback(data);
      })
      .fail(function(data) {
        errCallback(data);
      });
  }

  put(url, sendData, callback, errCallback) {

    var _this = this;

    $.ajax({
        type: 'PUT',
        url: url,
        data: sendData,
        dataType: 'json',
        // why is this commented out? it prevents us from stringifying the json
        //contentType: 'application/json',
        beforeSend: function(request){
          request.setRequestHeader("Authorization-Token", _this.helper.jwt());
        }
      })
      .done(function(data) {
        callback(data);
      })
      .fail(function(err) {
        errCallback(err);
      });
  }

  get(url, callback, errorCallback) {

    var _this = this;

    return $.ajax({
        type: 'GET',
        url: url,
        // headers:{
        //   'Authorization': _this.helper.jwt()
        // }
        beforeSend: function(request){
          request.setRequestHeader("Authorization-Token", _this.helper.jwt());
        }
      })
      .fail(function(err) {
        if(errorCallback){
          errorCallback(err);
        }
      })
      .done(function(data) {
        callback(data);
      });
  }

  getNoAuth(url, callback, errorCallback) {

    var _this = this;

    return $.ajax({
        type: 'GET',
        url: url
      })
      .fail(function(err) {
        if(errorCallback){
          errorCallback(err);
        }
      })
      .done(function(data) {
        callback(data);
      });
  }

  del(url, callback, errorCallback) {

    var _this = this;

    $.ajax({
        type: 'DELETE',
        url: url,
        // dataType: 'text',
        beforeSend: function(request){
          request.setRequestHeader("Authorization-Token", _this.helper.jwt());
        }
      })
      .fail(function(err) {
        errorCallback(err);
      })
      .done(function(data) {
        callback(data);
      });
  }

  delNoAuth(url, callback, errorCallback) {

    var _this = this;

    $.ajax({
        type: 'DELETE',
        url: url
      })
      .fail(function(err) {
        errorCallback(err);
      })
      .done(function(data) {
        callback(data);
      });
  }

  mockJwt(){
    return '';
  }

}
