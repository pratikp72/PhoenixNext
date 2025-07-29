/**
 * Created by montymccune on 10/15/18.
 */
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';

@inject(helper,http)
export class Pages {

  items = ['one', 'two', 'three'];


  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  activate(params) {

    var self = this;

    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

  }


  attached(){

  }

}
