/**
 * Created by montymccune on 11/17/17.
 */

import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';


class Row {
  constructor(){
    this.cells = [];
    this.data;
    this.selected = false;
    this.styleString = "background-color: white";
    this.selectedStyleString = "background-color: rgb(187,209,233)";

  }

  //doRowColor(){
  //  var self = this;
  //  if(self.selected){
  //    self.styleString = "background-color: rgb(187,209,233)";
  //  }else{
  //    self.styleString = "background-color: white";
  //  }
  //}
}

class Column {
  constructor(header){
    this.header = header;
    this.visible = true;
  }
}


@inject(helper,http)
export class DatagridHelper{

  rows = [];
  columns = [];

  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  selectRow(row){
    var self = this;
    for(var i = 0; i < self.rows.length; i++){
      var aRow = self.rows[i];
      aRow.selected = false;
    }
    row.selected = true;
  }


  columnExists(header){
    for(var i = 0; i < this.columns.length; i++){
      if(this.columns[i].header === header){
        return true;
      }
    }
    return false;
  }

  activate(){
    var self = this;
    self.columns.push(new Column("Date"));
    self.columns.push(new Column("Side"));
    self.columns.push(new Column("Part"));
    self.columns.push(new Column("Description"));
    self.columns.push(new Column("Finding"));
    self.columns.push(new Column("Instructions"));
    self.columns[5].visible = false;

    console.log("DATAGRIDHELPER ACTIVATE");

  }

  setColumnVisibility(columnIndex, visibility){
    this.columns[columnIndex].visible = visibility;
  }


  newRowFromXray(xray){
    var self = this;
    var aRow = new Row();
    var aDate = self.helper.getISODateToFormat(xray.ExamDateTime, "MM/DD/YYYY");
    aRow.cells.push(aDate);
    aRow.cells.push(xray.Body_Side);
    aRow.cells.push(xray.Body_Part);
    aRow.cells.push(xray.Description);
    aRow.cells.push(xray.XRayFinding);

    //add instructions IF we have any
    if(xray.Instructions != null &&
      xray.Instructions.length > 0){
      aRow.cells.push(xray.Instructions);
      self.columns[5].visible = true;
    }

    //outside
    if(xray.Type != null && xray.Type.toUpperCase() == "OUTSIDE"){
      aRow.styleString = "background-color: rgb(255,222,173)";
      aRow.selectedStyleString = "background-color: rgb(244,164,96)";
    }

    aRow.data = xray;
    return aRow;
  }

  clear(){
    var self = this;
    self.rows.splice(0, self.rows.length);
  }

  addRows(data, refresh){

    var self = this;

    if(refresh){
      self.rows.splice(0, self.rows.length);
    }

    if (data.length > 0) {

      for(var i = 0; i < data.length; i++){
        var xray = data[i];

        var aRow = self.newRowFromXray(xray);

        self.rows.push(aRow);

        if(i ==0){
          self.selectRow(aRow);
        }
      }
    }
  }

  removeRowByIndex(index){
    var self = this;
    for(var i = 0; i < self.rows.length; i++) {
      if(i == index){
        self.rows.splice(index, 1);
        break;
      }
    }
  }

  updateRowByIndexAndXray(index, xray){
    var row = this.newRowFromXray(xray);
    row.selected = true;
    //var temp = this.rows[index];

    this.rows.splice(index, 1, row);
  }


  getXrays(patientId, date){
    var self = this;
    //self.columns = [];
    self.rows = [];

    //var instructions = false;
    var aDate = self.helper.getDateWithFormat(date, "YYYY-MM-DD");
    var url = "xrayresult/view/patients/" + patientId + "/date/" + aDate;
    self.http.get(self.helper.getApiUrl(url), function(json){
      if (json.length > 0) {

        for(var i = 0; i < json.length; i++){
          var xray = json[i];
          var aRow = new Row();
          //select first row
          if(i ==0){
            aRow.selected = true;
          }
          var aDate = self.helper.getISODateToFormat(xray.ExamDateTime, "MM/DD/YYYY");
          aRow.cells.push(aDate);
          aRow.cells.push(xray.Body_Side);
          aRow.cells.push(xray.Body_Part);
          aRow.cells.push(xray.Description);
          aRow.cells.push(xray.XRayFinding);

          //add instructions IF we have any
          if(xray.Instructions != null &&
            xray.Instructions.length > 0){
            //if(!self.columnExists("Instructions")){
            //  self.columns.push(new Column("Instructions"));
            //}
            aRow.cells.push(xray.Instructions);
            self.columns[5].visible = true;
          }

          aRow.data = xray;
          self.rows.push(aRow);
        }
      }
    });
  }

}
