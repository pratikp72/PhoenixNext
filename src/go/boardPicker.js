import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Globals} from './globals';
import {EventAggregator} from 'aurelia-event-aggregator';



@inject(helper,http, Globals, EventAggregator, Data)
export class BoardPicker {

  boards=[];
  home=null;
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
    self.boards = model.userBoards;

    if(self.home.currentBoard == null || 
      self.home.currentBoard.visitInfo == null ||
      self.home.currentBoard.visitInfo.locked == 0 ||
      self.home.currentBoard.visitInfo.locked == undefined){
      self.locked = false;
    }else{
      self.locked = true;
    }

    //
    //self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;
  }

  close(){
    this.home.toggleBoardPicker();
  }

  selectBoardAndClose(index){
    var self = this;

    self.selectBoard(index, true);

    self.close();
  }

  selectBoard(index, saveBoard){
    var self = this;

    if(self.home.currentBoard == self.boards[index])return;

    var els = self.globals.packery.getItemElements();
    self.globals.packery.remove(els);

    if(self.home.currentBoard != null){
      self.home.currentBoard.clearDraggables();
    }

    var newBoard = self.boards[index];
    //clear objectIds...
    for(let b = 0; b < newBoard.blocks.length; b++){
      newBoard.blocks[b].objectId = 0;
    }
    newBoard.clearDraggables();

    if(self.home.currentBoard != null){
      //apply visitInfo...
      newBoard.visitInfo = self.home.currentBoard.visitInfo;
    }

    //check if we need to update OD_Visit_Code VisitBoardId here...
    if(newBoard.visitInfo != null && newBoard.visitInfo.visitCodeId != 0 && newBoard.id > 0 && saveBoard){//} && newBoard.visitInfo.boardId == null){
      self.createVisitBoardWithBoardAndVisitCodeId(newBoard, newBoard.visitInfo.visitCodeId, function (res){
        newBoard.visitInfo.boardId = res.id;
        self.home.currentBoard = newBoard;
        //update patientVisit boardId...
        var visit = _.find(self.home.patientVisits, function (v){return v.ObjectID == newBoard.visitInfo.visitCodeId});
        if(visit != undefined){
          visit.BoardId = res.id;
        }
      });
    }else if(saveBoard){
      self.data.saveUserBoard(newBoard, function(savedBoard){
        self.home.currentBoard = self.boards[index];
        self.home.currentBoard.id = savedBoard.id;
        //self.home.currentBoard = savedBoard;
      });
    }else{
      self.home.currentBoard = newBoard;
    }
  }

  createVisitBoardWithBoardAndVisitCodeId(board, visitCodeId, callback){

    var self = this;

    //save new visitBoard instance...
    var boardId = board.visitInfo ? board.visitInfo.boardId : board.id;
    var boardToSave = self.home.getUserBoardById(board.id);
    boardToSave.providerId = board.visitInfo.providerId;
    boardToSave.patientId = board.visitInfo.patientId;
    boardToSave.date = board.visitInfo.date;
    boardToSave.id = boardId;//0;//reset id for a new save...
    boardToSave.visitCodeId = visitCodeId;

    self.data.saveVisitBoard(boardToSave, function(boardRes){
      if(boardRes==false || boardRes == null){
        //some error...
      }else{
        //update OD_VisitCode.VisitBoardId...

        // if(boardRes == true){
        //   callback(boardToSave);
        //   return;//no need to update visitcode from a PUT response...
        // }

        self.data.getVisitCode(visitCodeId,function (vc) {
          //set vc.boardId....
          vc.VisitBoardId = boardRes.id;
          self.data.updateVisitCode(vc, function(res){
              callback(boardRes);
          });
        });
      }
    });
  }



  createNewBoard(){
    var aBoard = this.data.getNewBoard(this.globals.packery);
    aBoard.editing = true;
    this.boards.push(aBoard);
  }

  updateBoard(){
    var boardIndex = this.boards.length - 1
    this.boards[boardIndex].editing = false;
    this.selectBoard(boardIndex, true);
  }

  editCurrentBoard(isQuickAdd, editUserBoard){
    this.home.currentBoard.quickAdd = isQuickAdd;
    if(editUserBoard)
      this.home.currentBoard.userBoardEdit = editUserBoard;
    this.home.currentBoard.toggleEditing();
    this.close();
  }

  editBoardClick(isQuickAdd,index){
    var self = this;

    if(index != undefined &&
      self.home.currentBoard !== self.boards[index]){
      self.selectBoard(index, false);

      setTimeout(self.editCurrentBoard.bind(self, false, true), 200);

    }else{
      self.editCurrentBoard(isQuickAdd, true);
    }
  }

}
