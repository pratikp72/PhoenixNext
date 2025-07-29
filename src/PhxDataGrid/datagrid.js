/**
 * Created by tylerjones on 11/10/17.
 */

import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject} from 'aurelia-framework';
import {DatagridHelper} from './datagridHelper';

@inject(helper,http,DatagridHelper)
export class Datagrid {

  constructor(helper, http, DatagridHelper){
    this.helper = helper;
    this.http = http;
    this.datagridHelper = DatagridHelper;
  }

  activate(params) {

    console.log('window', window);

    var self = this;

    //here we check for out authentication key
    //IF it hasn't been obtained yet, we look to the query string
    if(typeof this.helper.jwt() === 'undefined' ||
      this.helper.jwt() == null){

      //if we find an API key in the query string
      //we need to re-authenticate to make sure it is still valid
      if (params.hasOwnProperty("jwt")){
        this.helper.processToken(params.jwt);
      }
    }
    else{
      //if we already have the apiKey we dont need to authenticate
      //mustAuthenticate = false;
    }

    this.datagridHelper.activate(); // THIS IS A CHANGE


    //this.datagridHelper.getXrays(params.patientId, params.date);
  }

  attached(){
    console.log("XRAY LOADED");
    this.datagridLoaded();
  }

  datagridLoaded(){
    let self = this;
    let bridge = self.helper.getBoundObject();
    if(bridge){
      bridge.phxDataGrid_loaded();
    }
  }

  rowRightClick(value, rowIndex){
    const self = this;

    //delete row
    let bridge = self.helper.getBoundObject();
    if(bridge){
      let stringifiedData = JSON.stringify(self.datagridHelper.rows[rowIndex].data);
      bridge.phxDataGrid_rightClick(value, stringifiedData, rowIndex);//JSON.stringify(finalCode));
    }
  }

  rowClicked(value, row, colIndex, rowIndex){
    let self = this;
    self.datagridHelper.selectRow(row);

    let bridge = self.helper.getBoundObject();
    if(bridge){
      let stringifiedData = JSON.stringify(row.data);
      bridge.phxDataGrid_click(value, stringifiedData, rowIndex, colIndex);//JSON.stringify(finalCode));
    }
  }

  rowDoubleClicked(value, rowIndex){
    let self = this;
    let bridge = self.helper.getBoundObject();
    if(bridge){
      let stringifiedData = JSON.stringify(self.datagridHelper.rows[rowIndex].data);
      bridge.phxDataGrid_doubleClick(value, stringifiedData, rowIndex);//JSON.stringify(finalCode));
    }
  }

}
