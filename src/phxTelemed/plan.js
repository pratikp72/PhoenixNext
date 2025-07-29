import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';

@inject(helper,http)
export class Plan {

  data;

  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  activate(model) {
    this.data = model;
  }

}
