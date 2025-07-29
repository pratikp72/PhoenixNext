import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
//import {Data} from './data';
import {TestBlockData} from './testBlockData'
import * as _ from 'lodash';
import moment from 'moment';
import {AlertPopup} from "../ptdaysheet/alertPopup";
import {DxSearch} from '../phxTelemed/dxSearch';
import {DialogService} from 'aurelia-dialog';
import {PreferenceBuilder} from "./preferenceBuilder";
import {PxSearch} from '../phxTelemed/pxSearch';
import {PatientSearch} from '../phxTelemed/patientSearch';
import {Task} from '../phxTelemed/task';
import {DialogView} from '../phxTelemed/dialogView';
import {Router} from 'aurelia-router';
import {Home} from '../phxTelemed/home';


@inject(helper,http, TestBlockData, DialogService, Router, Home )
export class iPadHome {

  examVisible = true;
  medVisible = false;
  surgeryVisible = false;
  dxVisible = false;
  editing=false

  currentBoard;

  boards=[];

  constructor(helper, http, TestBlockData, DialogService, Router, Home){
    this.helper = helper;
    this.http = http;
    this.data = TestBlockData;
    this.dialogService = DialogService;
    this.router = Router;
    this.home = Home;
  }

  activate(params) {
    this.boards = this.data.setupSampleData();
    this.currentBoard = this.boards[0];
  }

  loadBoard(board){
    this.currentBoard = board;
  }

  sidebarClick(item){

    this.examVisible = false;
    this.medVisible = false;
    this.surgeryVisible = false;
    this.dxVisible = false;

    if(item === 'exam'){
      this.examVisible = true;
    }else if(item == 'meds'){
      this.medVisible = true;
    }else if(item == 'surgery'){
      this.surgeryVisible = true;
    }else if(item == 'dx'){
      this.dxVisible = true;
    }else if(item == 'edit'){
      this.toggleEditingMode();
    }
  }

  addRow(board){
    this.data.addRow(board);
  }

  addBlock(row, type){
    this.data.addBlock(row, type);
  }

  deleteRow(board, index){
    this.data.deleteRow(board, index);
  }

  toggleEditingMode(){

    this.editing = this.editing ? false : true;

    for(var i = 0; i < this.currentBoard.rows.length; i++){
      var aRow = this.currentBoard.rows[i];
      for(var b = 0; b < aRow.blocks.length; b++){
        var aBlock = aRow.blocks[b];
        aBlock.toggleEditing();
      }
    }

  }

}
