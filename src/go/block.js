import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
//import {Data} from '../data';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Router} from 'aurelia-router';
import {Globals} from './globals';
import {Home} from './home';
import {EventAggregator} from 'aurelia-event-aggregator';



@inject(helper,http,DialogService, Router, Globals, Home, EventAggregator )//Data
export class Block {

  sizeList = ["1", "2", "3", "4"];
  heightList=["2","4","6","8"];

  // sizeList = [1, 2, 3, 4];
  // heightList=[2, 4, 6, 8];
  data = null;
  showResizeButton=false;

  originalWidthMult;
  originalHeightMult;
  originalHeight=null;
  isResized=false;
  locked = false;

  selectedHeight;
  selectedWidth;


  constructor(helper, http, DialogService, Router, Globals, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.dialogService = DialogService;
    this.router = Router;
    this.globals = Globals;
    this.home = Home;
    this.eventAggregator = EventAggregator;
  }

  activate(params) {
    let self = this;
    self.data = params;
    self.showResizeButton = self.data.showResizeButton;
    self.originalHeightMult = self.data.heightMult;
    self.originalWidthMult = self.data.widthMult;

    if(self.home.currentBoard.visitInfo ==null){
      self.locked = false;
    }else if(self.home.currentBoard.visitInfo.locked == 0){
      self.locked = false;
    }else{
      self.locked = true;
    }

    self.eventAggregator.subscribe('resetBlockSize', function(){
      self.isResized = false;
      self.eventAggregator.publish('blockresized');
    });
  }

  // togglePin(){

  //   let self = this;

  //   self.home.currentBoard.hasChanged = true;

  //   self.data.pinned = self.data.pinned ? false : true;

  //   // if(self.data.pinned){
  //   //   $(this.blockelement).addClass('pinned');
  //   //   self.globals.packery.stamp(self.blockelement);
  //   // }else{
  //   //   $(this.blockelement).removeClass('pinned');
  //   //   self.globals.packery.unstamp(self.blockelement);
  //   // }
  //   //self.setPinned(self.data.pinned);

  //   //self.globals.packery.layout();

  // }

  toggleResize(){
    this.isResized = this.isResized ? false : true;

    var tempWidth = this.isResized ? 4 : this.originalWidthMult;
    var tempHeight = this.isResized ? 2 : this.originalHeightMult;

    if(this.originalHeight == null){
      this.originalHeight = this.data.element.style.height;
    }

    if(this.isResized){
      //remove any height class....
      this.data.element.style.height = '';
      //this.data.isResized = true;//add property
    }else{
      this.data.element.style.height = this.originalHeight;
      //this.data.isResized = false;
    }


    if(this.isResized){
      this.setWidthHeightWithLayout(tempWidth, tempHeight);
    }else{
      this.setWidth(tempWidth);
      this.home.currentBoard.displayBlockLayout();
    }

    this.eventAggregator.publish('blockresized');

  }

  attached(){
    this.data.element = this.blockelement;
    this.setWidth(this.data.widthMult);
    this.setHeight(this.data.heightMult);

    //add pinned class only here...
    // if(this.data.pinned){
    //   $(this.blockelement).addClass('pinned');
    // }
    //this.setPinned(this.data.pinned);
    // this.globals.packery.layout();
  }

  // setPinned(isPinned){
  //   let self = this;
  //   if(isPinned){
  //     $(self.blockelement).addClass('pinned');
  //     self.globals.packery.stamp(self.blockelement);
  //   }else{
  //     $(self.blockelement).removeClass('pinned');
  //     self.globals.packery.unstamp(self.blockelement);
  //   }
  // }

  setWidthHeightWithLayout(width, height){

    this.setWidth(width);
    this.setHeight(height);
    this.globals.packery.fit(this.data.element);
    // this.globals.packery.layout();
    this.home.currentBoard.hasChanged = true;
  }

  setWidthWithLayout(mult){
    this.setWidth(mult);
    this.globals.packery.layout();
    this.home.currentBoard.hasChanged = true;
  }

  setHeightWithLayout(mult){
    this.setHeight(mult);
    this.globals.packery.layout();
    this.home.currentBoard.hasChanged = true;
  }

  setWidth(mult){
    this.data.widthMult = mult;

    this.selectedWidth = mult;

    var width = mult * 25;

    $(this.blockelement).removeClass([this.data.widthCls, 'pack-w25']);

    this.data.widthCls = 'pack-w' + width;

    $(this.blockelement).addClass(this.data.widthCls);
    //this.globals.packery.layout();
  }

  setHeight(mult){

    this.data.heightMult = mult;

    this.selectedHeight = mult;

    // var height = mult * 25;
    //var hPct = mult > 4 ? 12.5 : this.getHeightPercentage();//10

    //var height = mult * hPct;

    $(this.blockelement).removeClass(this.data.heightCls);

    // this.data.heightCls = 'pack-h' + height;
    var tHeightClass = this.getHeightClassWithPercentage(12.5, mult);
    this.data.heightCls = tHeightClass;

    $(this.blockelement).addClass(this.data.heightCls);
  }

  getHeightClassWithPercentage(percent, multiplier){
    var height = percent * multiplier;
    var isDecimal = height % 1;
    if(isDecimal == 0){
      return 'pack-h' + height;
    }else{
      return 'pack-h' + Math.floor(height) + "-5";
    }
  }

  getHeightPercentage(){
    let self = this;
    var twentyfive = _.find(self.home.currentBoard.blocks, function(b){return b.heightMult > 4});
    return twentyfive ? 12.5 : 25;//10
  }

  deleteBlock(){
      this.home.currentBoard.deleteBlock(this.data.id);
      this.home.currentBoard.removeDraggable(this.data.id);
      this.home.currentBoard.removePosition(this.data.id);
      this.globals.packery.remove(this.blockelement);
      this.globals.packery.shiftLayout();
      //this.globals.packery.layout();
      this.home.currentBoard.hasChanged = true;
  }

  editBoard(){
    this.home.currentBoard.toggleEditing();
  }


}
