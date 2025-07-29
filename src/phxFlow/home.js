/**
 * Created by montymccune on 10/15/18.
 */
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import {Data} from './data';
import * as _ from 'lodash';
import moment from 'moment';

@inject(helper,http, Data)
export class Home {

  blocks=[];
  sidebarVisible = false;

  setupFlowTimer;
  totalFlowObjects = 10;

  constructor(helper, http, Data){
    this.helper = helper;
    this.http = http;
    this.data = Data;
  }

  toggleSidebar(){
    this.sidebarVisible = this.sidebarVisible ? false : true;
  }

  toggleBlock(b){
    for(var i = 0; i < this.blocks.length; i++){
      this.blocks[i].collapsed = false;
    }
    b.collapsed = b.collapsed ? false : true;
  }

  sortTime(){
    this.blocks =  _.sortBy(this.blocks, ['createdAt']);
  }

  sortFlow(){
    var s =  _.sortBy(this.blocks, ['type']);
    //find patients
    var pats = _.remove(s, function(b){
      return b.type == 'patient';
    });
    //add patient to top of list
    var final = _.concat(pats, s);
    this.blocks = final;

  }

  completeBlock(index){
    this.blocks.splice(index, 1);
  }

  activate(params) {

    if (params.hasOwnProperty("userid")){
      //this.helper.processToken(params.jwt);

      var userid = params.userid;
    }

    this.setupBlocks();
  }

  setupBlocks(){

    this.setupFlowTimer = setInterval(_ =>{
      this.addFlowElement(this);
    }, 1000);

  }

  addFlowElement(t) {

    var self = t;

    var r = Math.random();
    var type = "task";
    if(r <= 0.3){
      type = "task";
    }else if(r > 0.3 && r <= 0.6){
      type = "patient";
    }
    else{
      type = "message";
    }
    var block = self.data.createBlock(type, r);
    self.blocks.push(block);

    if(self.blocks.length >= self.totalFlowObjects){
      clearInterval(self.setupFlowTimer);

      self.sortFlow();
    }
  }

  launchItem(item){

    item.toggleStepState();

    if(typeof bound !== 'undefined'){
      bound.phxflow_launchItem(item.type, item.patientId);
    }
  }

}
