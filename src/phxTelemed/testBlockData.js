import moment from 'moment';
import * as _ from 'lodash';
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';


class BlockData{
  constructor(description, columnWidth, row){
    this.description = description;
    this.width=columnWidth;
    this.editing = false;
    this.id=0;
    this.row = row;
    this.blockType = 'plan';
  }

  toggleEditing(){
    this.editing = this.editing ? false : true;
  }
}

class Row{
  constructor(){
    this.blocks=[];
  }

  addBlock(block){
    this.blocks.push(block);
  }

  deleteBlock(block){
    for(var i = 0; i<this.blocks.length; i++){
      var aBlock = this.blocks[i];
      if(aBlock.id == block.id){
        this.blocks.splice(i, 1);
      }
    }
  }
}

class Board{
  constructor(description, rows){
    this.description = description;
    this.rows = rows;
  }
}

@inject(helper,http)
export class TestBlockData {


  blockIdCounter = 0;



  blockTypes=["Procedure", "Plan", "Exam", "Diagnosis", "medAllergy"];

  constructor(helper, http) {
    this.helper = helper;
    this.http = http;
  }

  addRow(board){
    board.rows.push(new Row());
  }

  addBlock(row, type){
    var bData = this.createBlock(type, 4, row, type);
    bData.editing = true;
    row.addBlock(bData)
  }

  createBlock(description, colWidth, row, type){
    var bData = new BlockData(description, colWidth);
    this.blockIdCounter++;
    bData.id = this.blockIdCounter;
    bData.row = row;
    bData.blockType = type ? type : "plan";
    return bData;
  }

  deleteRow(board, index){
    board.rows.splice(index, 1);
  }

  setupSampleData(){

    var row1 = new Row();
    var bData = this.createBlock("Something", 4, row1);
    var bData1 = this.createBlock("Wow", 6, row1);
    var bData4 = this.createBlock("noice", 2, row1);

    var row2 = new Row();
    var bData2 = this.createBlock("Yahoo", 6, row2);
    var bData3 = this.createBlock("GetIT", 6, row2);

    var row3 = new Row();
    var bData6 = this.createBlock("Ahah", 3, row3);
    var bData7 = this.createBlock("Swank!", 4, row3, "medAllergy");


    row1.addBlock(bData);
    row1.addBlock(bData1);
    row1.addBlock(bData4);

    row2.addBlock(bData2);
    row2.addBlock(bData3);

    row3.addBlock(bData6);
    row3.addBlock(bData7);

    var rows = [];
    rows.push(row1);
    rows.push(row2);

    var rows2=[];
    rows2.push(row3);

    var boards =[];

    var aBoard = new Board("Sample Board", rows);
    var aBoard2 = new Board("Test Board #2", rows2);
    boards.push(aBoard);
    boards.push(aBoard2);

    return boards;

  }
}
