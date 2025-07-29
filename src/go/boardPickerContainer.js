import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Globals} from './globals';
import {EventAggregator} from 'aurelia-event-aggregator';



@inject(helper,http, Globals, EventAggregator, Data)
export class BoardPickerContainer {

  boardPickerModel=null;

  componentSelected = false;
  userBoardSelected=false;
  componentEnabled = false;

  constructor(helper, http, Globals, EventAggregator, Data) {
    this.helper = helper;
    this.http = http;
    this.globals = Globals;
    this.events = EventAggregator;
    this.data = Data;
  }

  activate(model) {
    var self = this;
    self.boardPickerModel = model;
    self.componentEnabled = model.home.currentBoard != null ? true : false;
    if(self.componentEnabled == true){
      self.componentSelected = true;
    }
  }

  selectTab(t){
    let self = this;
    if(t == 'card'){
      self.componentSelected = true;
      self.userBoardSelected = false;
    }else{
      self.componentSelected = false;
      self.userBoardSelected = true;
    }
  }

  close(){
    this.boardPickerModel.home.toggleBoardPicker();
  }









}
