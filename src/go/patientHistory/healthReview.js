import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';


@inject(helper,http, Data, Home )
export class HealthReview {

  history;

  constructor(helper, http, Data, Home) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
  }

  activate(model){
    let self = this;
    self.history = model.history;
  }
}
