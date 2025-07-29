import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {Globals} from './globals';
import {Data} from '../data/go/data';


@inject(helper,http, Globals, Data )
export class Board {

  board;

  constructor(helper, http, Globals, Data) {
    this.helper = helper;
    this.http = http;
    this.globals = Globals;
    this.data = Data;
  }

  activate(params) {
    this.board = params;
  }

  cancelClick(){
    var self = this;

    self.board.toggleEditing(function(){
    });
  }

  togglePreference(){
    var self = this;
    self.board.isDefault = self.board.isDefault ? false : true;
  }

  updateClick(){
    var self = this;
    self.board.toggleEditing(function(){
      if(self.board.userBoardEdit){
        self.board.userBoardEdit = false;
        self.saveUserBoard();
      }else{
        self.saveVisitBoard();
      }
    });
  }


  saveVisitBoard(){
    var self = this;

    // self.board.toggleEditing(function(){
      if(self.board.hasChanged){
        //update Visit board....
        self.data.saveVisitBoard(self.board);
        self.board.hasChanged=false;
      }
    // });
  }

  saveUserBoard(){
    var self = this;
    // self.board.toggleEditing(function(){
      self.data.saveUserBoard(self.board);
    // });
  }

}
