import {DialogController} from 'aurelia-dialog';
import {inject, observable, computedFrom} from 'aurelia-framework';
import { Data } from '../../data/go/data';
import * as _ from 'lodash';

class WhereColumn{
  constructor(data, operator, value, andOrWhere){
    this.data = data;
    this.andOrWhere = andOrWhere;
    this._operator=operator;
    this.value=value;
  }
}

@inject(DialogController, Data)
export class SqlSelector {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  dataTables=[];
  dataColumns=[];

  selectedColumns=[];
  selectedWhereColumns=[];

  @observable table;
  tableChanged(newVal, oldVal){
    if(newVal){
      this.getDataColumnsForTable(newVal);

      if(newVal && oldVal && newVal.TableAlias != oldVal.TableAlias){
        //remove selects, where, etc...
        this.selectedColumns=[];
        this.selectedWhereColumns=[];
        this.andOrWhereOperator='WHERE';
        this.whereColumn=null;
        this.whereColumnOperator = null;
        this.whereColumnValue = null;
        this.isAndSelected = true;
        this.isOrSelected = false;
      }

    }
  }
  tableMatcher = (a, b) => a != null && b != null && a.TableFriendlyName === b.TableFriendlyName;

  @observable column;
  columnChanged(newVal, oldVal){

  }

  @computedFrom('column')
  get isColumnAdded(){
    return this.column == null ? true : false;
  }

  @computedFrom('whereColumn', 'whereColumnOperator', 'whereColumnValue')
  get isWhereAdded(){
    if(this.whereColumn == null && this.whereColumnOperator == null && 
      (this.whereColumnValue == null || this.whereColumnValue == "")){
      return true;
    }else{
      return false;
    }
  }

  whereColumn;
  whereColumnOperator;
  whereColumnValue;
  isAndSelected=true;
  isOrSelected=false;
  andOrWhereOperator='WHERE';

  sqlObjToLoad=null;

  stringFilterValues=[
    {
      friendlyOperator: 'Equal to',
      op: '=',
      not: false
    }, 
    {
      friendlyOperator: 'Not Equal to',
      op: '!=',
      not: true
    }, 
    {
      friendlyOperator: 'Begins with',
      op: 'LIKE',
      not: false
    }, 
    {
      friendlyOperator: 'Not Begins with',
      op: 'NOT LIKE',
      not: true
    }, 
    {
      friendlyOperator: 'Ends with',
      op: 'LIKE',
      not: false
    }, 
    {
      friendlyOperator: 'Not Ends with',
      op: 'NOT LIKE',
      not: true
    }, 
    {
      friendlyOperator: 'Contains',
      op: 'LIKE',
      not: false
    },
    {
      friendlyOperator: 'Not Contains',
      op: 'NOT LIKE',
      not: true
    }];

  numberFilterValues=[
    {
      friendlyOperator: 'Equal to',
      op: '=',
      not: false
    },
    {
      friendlyOperator: 'Not Equal to',
      op: '!=',
      not: true
    },
    {
      friendlyOperator: 'Greater than',
      op: '>',
      not: false
    },
    {
      friendlyOperator: 'Not Greater than',
      op: '!>',
      not: true
    },
    {
      friendlyOperator: 'Less than',
      op: '<',
      not: false
    },
    {
      friendlyOperator: 'Not Less than',
      op: '!<',
      not: true
    },
    {
      friendlyOperator: 'Greater or Equal to',
      op: '>=',
      not: false
    },
    {
      friendlyOperator: 'Not Greater or Equal to',
      op: '<',
      not: true
    },
    {
      friendlyOperator: 'Less or Equal to',
      op: '<=',
      not: false
    },
    {
      friendlyOperator: 'Not Less or Equal to',
      op: '>',
      not: true
    }];// ,  'Between'];


  constructor(DialogController, Data){
    this.dialogController = DialogController;
    this.data = Data;
  }

  activate(obj){
    let self = this;
    self.popupWidth = obj.popupWidth / 2;
    self.popupHeight = obj.popupHeight / 2;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
    if(obj.options){
      if(obj.options.sqlObj){
        self.sqlObjToLoad = obj.options.sqlObj;
      }
    }
  }

  attached(){
    let self = this;

    self.getDataTables(function(){

      //setup sql if we have one to load...
      if(self.sqlObjToLoad){
        setTimeout(self.setupSqlObjToLoad.bind(self), 500);
      }
    });

    var res = $(self.genpicklist).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }
  }

  setupSqlObjToLoad(){
    if(this.sqlObjToLoad){
      this.table=this.sqlObjToLoad.table;
      this.selectedWhereColumns=this.sqlObjToLoad.where;
      this.selectedColumns = this.sqlObjToLoad.columns;
    }
  }

  getDataTables(callback){
    let self = this;
    self.data.getWithUrl('reportingcolumninfo/categories', function(res){
      self.dataTables = res;
      callback();
    });
  }

  getDataColumnsForTable(table){
    let self = this;
    self.data.getWithUrl(`reportingcolumninfo?category=${table.TableFriendlyName}`, function(res){
      self.dataColumns = res;
    });
  }

  addColumn(){
    let self = this;
    if(self.column){
      //does column exist???
      if(!_.find(self.selectedColumns, function(c){return c.ColumnID == self.column.ColumnID})){
        self.selectedColumns.push(self.column);
        self.column = null;
      }
    }
  }

  addWhereColumn(){
    let self = this;
    if(self.whereColumn && self.whereColumnOperator && self.whereColumnValue){

      //set AND, OR , WHERE...
      if(self.selectedWhereColumns.length == 0){
        self.andOrWhereOperator = 'WHERE';
      }else if(self.isAndSelected){
        self.andOrWhereOperator = 'AND';
      }else{
        self.andOrWhereOperator = 'OR';
      }

      //does column exist???
      if(!_.find(self.selectedWhereColumns, function(c){return c.data.ColumnID == self.whereColumn.ColumnID})){
        var wc = new WhereColumn(self.whereColumn, self.whereColumnOperator, self.whereColumnValue, self.andOrWhereOperator);
        self.selectedWhereColumns.push(wc);
        self.whereColumn = null;
        self.whereColumnOperator = null;
        self.whereColumnValue = null;
      }
    }
  }

  toggleAndOr(){
    this.isAndSelected=this.isAndSelected ? false : true;
    this.isOrSelected=this.isAndSelected ? false : true;
  }

  removeWhere(wc){
    let self = this;
    //does column exist???
    var foundIndex = _.findIndex(self.selectedWhereColumns, function(c){return c.data.ColumnID == wc.data.ColumnID});
    if(foundIndex > -1){
      self.selectedWhereColumns.splice(foundIndex, 1);
    }
    //update and, or, where's...
    for(var i = 0; i < self.selectedWhereColumns.length; i++){
      self.selectedWhereColumns[i].andOrWhere = i == 0 ? 'WHERE' : self.selectedWhereColumns[i].andOrWhere;
    }
  }

  removeSelect(column){
    let self = this;
    //does column exist???
    var foundIndex = _.findIndex(self.selectedColumns, function(c){return c.ColumnID == column.ColumnID});
    if(foundIndex > -1){
      self.selectedColumns.splice(foundIndex, 1);
    }
  }

  ok(){
    let self = this;
    self.dialogController.close(true, {table: self.table, where: self.selectedWhereColumns, columns: self.selectedColumns });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
