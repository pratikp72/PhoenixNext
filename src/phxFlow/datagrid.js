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
    if(typeof bound !== 'undefined'){
      bound.phxDataGrid_loaded();
    }
  }

  rowRightClick(value, rowIndex){
    var self = this;

    //delete row

    if(typeof bound !== 'undefined'){
      bound.phxDataGrid_rightClick(value, self.datagridHelper.rows[rowIndex].data, rowIndex);//JSON.stringify(finalCode));
    }
  }

  rowClicked(value, row, colIndex, rowIndex){
    var self = this;
    self.datagridHelper.selectRow(row);

    if(typeof window.bound !== 'undefined'){
      window.bound.phxDataGrid_click(value, row.data, rowIndex, colIndex);//JSON.stringify(finalCode));
    }
  }

  rowDoubleClicked(value, rowIndex){
    var self = this;
    if(typeof bound !== 'undefined'){
      bound.phxDataGrid_doubleClick(value, self.datagridHelper.rows[rowIndex].data, rowIndex);//JSON.stringify(finalCode));
    }
  }

}
