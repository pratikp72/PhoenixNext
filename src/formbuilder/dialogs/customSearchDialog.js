import {DialogController} from 'aurelia-dialog';
import {inject, computedFrom} from 'aurelia-framework';
import { PopupHelper } from '../../go/popupHelper';
import { Data } from '../../data/go/data';
import * as _ from 'lodash';


class Row{
  constructor(){
    this.cells=[];
  }
}

class Cell{
  constructor(){
    this.value=null;
    this.index = 0;
  }
}

class EditTableItem{
  constructor(itm){
    this.item = itm;
    this.cell = null;
  }

  @computedFrom('editIndex')
  get displayIndex(){
    return this.editIndex == -1 ? 'X' : this.editIndex + 1;
  }
}

@inject(DialogController, PopupHelper, Data)
export class CustomSearchDialog {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  sqlObj=null;

  searchResults=[];
  tableHeaders=[];

  searchTerm=null;
  scrollHeight;

  headerClass="flex-fill";

  editMode=true;
  editTableObject=null;

  @computedFrom('sqlObj')
  get searchPlaceholderDescription(){
    var placeHolder = "Search...";
    if(this.sqlObj && this.sqlObj.where){
      placeHolder = "Search ";
      for(var i = 0; i < this.sqlObj.where.length; i++){
        if(this.sqlObj.where[i].data.ColumnFriendlyName){
          placeHolder += this.sqlObj.where[i].data.ColumnFriendlyName.toLowerCase() +  " ";
        }
      }
      placeHolder += "..."
    }
    return placeHolder;
  }

  constructor(DialogController, PopupHelper, Data){
    this.dialogController = DialogController;
    this.popupHelper = PopupHelper;
    this.data = Data;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 2;
    self.popupHeight = obj.popupHeight / 2;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    if(obj.myTable){
      self.setupEditTableObject(obj.myTable);
    }

  }

  setupEditTableObject(myTable){

    this.editTableObject={
      items: []
    }

    let aRow = null;
    if(myTable.displayHeaders){
      //get 2nd row...
      aRow = myTable.rows[1];
    }else{
      //get first row...
      aRow = myTable.rows[0];
    }

    for(var c = 0; c < aRow.cells.length; c++){
      let aEditTableItem = new EditTableItem(aRow.cells[c].item);
      this.editTableObject.items.push(aEditTableItem);
    }

  }


  // buildSampleSearchResults(){
  //   var data=[
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray"},
  //     {"Code": "12345", "Description": "Some X-Ray Three Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Broseph Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Stuff"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"},
  //     {"Code": "12345", "Description": "Some X-Ray Two Views"}
  //   ]

  //   this.tableHeaders.push("Code");
  //   this.tableHeaders.push("Description");
  //   this.buildResultRows(data);
  // }

  attached(){
    let self = this;
    var res = $(self.cSearchDialog).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }

    const windowHeight = window.innerHeight;
    this.maxScrollHeight = windowHeight / 3;

    //this.buildSampleSearchResults();

    if(this.editMode && this.sqlObj == null){
      //open sql editor...
      this.openSqlSelector();
    }

  }

  search(){
    let self = this;
    //update sqlObj values...

    for(var i = 0; i < self.sqlObj.where.length; i++){
      self.sqlObj.where[i].value = self.searchTerm;
    }

    self.data.postWithUrlAndData('helpers/sqlselector', JSON.stringify(self.sqlObj), function(dt){
      self.buildResultRows(dt);
    });
  }

  buildResultRows(dataTable){
    let self = this;
    for(var r = 0; r < dataTable.length; r++){
      var dRow = dataTable[r];
      var first = r == 0 ? true : false;
      const props = Object.keys(dRow);
      const vals = Object.values(dRow);
      var aRow = new Row();
      for(var c = 0; c < props.length; c++){
        var prop = props[c];
        var val = vals[c];
        var aCell = new Cell();
        aCell.value = val;
        aRow.cells.push(aCell);
      }
      self.searchResults.push(aRow);
    }
  }

  openSqlSelector(){
    let self = this;
    self.popupHelper.openSqlSelector(function(res){

      self.sqlObj = res;

      //setup table headers...
      // for(var i = 0; i < self.sqlObj.where.length; i++){
      //   var aCell = new Cell();
      //   aCell.value = self.sqlObj.where[i].data.ColumnFriendlyName;
      //   aCell.index = i;
      //   self.tableHeaders.push(aCell);
      // }

      for(var i = 0; i < self.sqlObj.columns.length; i++){
        var aCell = new Cell();
        aCell.value = self.sqlObj.columns[i].ColumnFriendlyName;
        aCell.index = i;
        self.tableHeaders.push(aCell);
      }

    }, {});
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {name: self.formName, type: self.selectedType });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
