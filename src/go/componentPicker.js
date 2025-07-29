import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Globals} from './globals';
import {EventAggregator} from 'aurelia-event-aggregator';



@inject(helper,http, Globals, EventAggregator, Data)
export class ComponentPicker {

  home=null;
  components=[];
  locked = false;

  constructor(helper, http, Globals, EventAggregator, Data) {
    this.helper = helper;
    this.http = http;
    this.globals = Globals;
    this.events = EventAggregator;
    this.data = Data;
  }

  activate(model) {
    var self = this;
    self.home = model.home;
    self.components = model.components;
    self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;
  }

  attached(){
    var self = this;
  }

  close(){
    this.home.toggleBoardPicker();
  }

  // editCurrentBoard(isQuickAdd){
  //   //this.home.currentBoard.quickAdd = isQuickAdd;
  //   this.home.currentBoard.toggleEditing();
  //   this.close();
  // }

  addComponent(c){

    //does this component exist already??
    // let exists = this.home.currentBoard.getBlockWithType(c);
    // if(exists){
    //   return;
    // }
    // let options={
    //   editing: false,
    //   widthMult: 2,
    //   loadData: true,
    //   leftToRightSort: true,
    //   openPopup: c == 'jointInjection' ? true: false
    // }


    // let newBlock = this.home.currentBoard.addBlock(c, options);

    // //add position object...
    // this.home.currentBoard.addPosition(newBlock.id, newBlock.x);
    // //this.home.currentBoard.updatePositions();
    // this.data.saveVisitBoard(this.home.currentBoard);

    this.home.addNewBlockComponentToBoard(c);

    this.close();
  }

}
