import {DialogController} from 'aurelia-dialog';
import {inject, bindable, observable} from 'aurelia-framework';
import { formhelper } from '../formhelper';
import _ from 'lodash';



@inject(DialogController, formhelper)
export class TableCellOptions {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  setup=true;

  options=null;

  @bindable item;
  @bindable cell;
  cellChanged(newVal, oldVal){
    this.setupTableCellOptions(newVal);
  }
  @bindable editor;

  borderPositionsList=[
                        {name: 'TOP', checked: false, value: 'border-top'}, 
                        {name: 'RIGHT', checked: false, value: 'border-right'}, 
                        {name: 'BOTTOM', checked: false, value: 'border-bottom'}, 
                        {name: 'LEFT', checked: false, value: 'border-left'}];//{name: 'ALL', checked: false, value: 'border'}, 
  borderSizes=[1, 2, 3, 4];
  borderSize=1;
  borderColor='#000000';
  backgroundColor= '#000000';
  updateBorderColor=true;
  pickerColor=null;
  pickerTop=0;
  pickerLeft=0;

  cellMode=true;//edit cell OR table...

  @observable padding=0;
  paddingChanged(newVal, oldVal){
    if(this.setup==true)return;

    this.updateCellPadding(newVal);
  }

  @observable cellWidth=0;
  cellWidthChanged(newVal, oldVal){
    if(this.setup==true)return;
    this.updateCellWidth(newVal);
  }
  @observable cellHeight=0;
  cellHeightChanged(newVal, oldVal){
    if(this.setup==true)return;
    this.updateCellHeight(newVal);
  }

  myTableObject=null;

  @observable colorPickerVisible=false;
  colorPickerVisibleChanged(newVal, oldVal){
    if(newVal == false && oldVal == true){
      //the picker WAS open...update color...
      if(this.updateBorderColor){
        //update border color...
        // this.borderColor = this.pickerColor;
        this.setBorderColor(this.pickerColor);
      }else{
        //update backgound color...
        //this.backgroundColor = this.pickerColor;
        this.setBackgroundColor(this.pickerColor);
      }
    }
  }

  constructor(DialogController, formhelper){
    this.dialogController = DialogController;
    this.formHelper = formhelper;
  }


  attached(){
    this.myTableObject = this.item.table;
    //this.parseBorder();
    //check ALL border list item...
    //this.borderPositionsList[0].checked = true;
    this.parseCellWidthHeight();
    this.setup = false;
  }

  setupTableCellOptions(cell){
    //update border positions list...
    // for(var c = 0; c < cell.styles.length; c++){
    //   var aStyle = cell.styles[c];
    //   var borderStyle = _.find(this.borderPositionsList, function(b){return b.value == aStyle.name});
    //   if(borderStyle){
    //     borderStyle.checked = true;//aStyle.value == 'none' ? false : true;
    //   }
    // }
    for(var c = 0; c < this.borderPositionsList.length; c++){
      var border = this.borderPositionsList[c];
      var borderStyle = _.find(cell.styles, function(b){return b.name == border.value});
      border.checked = borderStyle ? true : false;
    }
  }

  toggleCellOrTable(){
    this.cellMode = this.cellMode ? false : true;
  }

  parseCellWidthHeight(){
    var cHeight = _.find(this.cell.styles, function(s){return s.name == 'height'});
    if(cHeight){
      //remove PX...
      this.cellHeight = cHeight.value.replace('px','');
    }
    var cWidth = _.find(this.cell.styles, function(s){return s.name == 'width'});
    if(cWidth){
      this.cellWidth = cWidth.value;
    }else{
      this.cellWidth = '100%';
    }
  }

  parseBorder(){
    for(var i = 0; i < this.cell.styles.length; i++){
      var style = this.cell.styles[i];
      if(style.name == 'border-top'){
        //check item in dropdown...
        var pos = _.find(this.borderPositionsList, function(b){return b.name == 'TOP'});
        pos.checked = true;
        this.borderSize = this.getBorderSizeFromStyle(style.value);
      }else if(style.name == 'border-right'){
        //check item in dropdown...
        var pos = _.find(this.borderPositionsList, function(b){return b.name == 'RIGHT'});
        pos.checked = true;
        this.borderSize = this.getBorderSizeFromStyle(style.value);
      }else if(style.name == 'border-bottom'){
        //check item in dropdown...
        var pos = _.find(this.borderPositionsList, function(b){return b.name == 'BOTTOM'});
        pos.checked = true;
        this.borderSize = this.getBorderSizeFromStyle(style.value);
      }else if(style.name == 'border-left'){
        //check item in dropdown...
        var pos = _.find(this.borderPositionsList, function(b){return b.name == 'LEFT'});
        pos.checked = true;
        this.borderSize = this.getBorderSizeFromStyle(style.value);
      }
    }
  }

  getBorderSizeFromStyle(borderStyle){
    var splitStyle = borderStyle.split('px');
    if(splitStyle.length > 0){
      return splitStyle[0];
    }
  }

  toggleTableHeaders(){

    this.myTableObject.toggleTableHeaders();

    if(this.myTableObject.displayHeaders){
      //get first row to check for existing items...
      var row = this.myTableObject.getRow(0);

      //insert header row...clone...
      var headerRow = row.cloneRow();
      this.myTableObject.insertRow(headerRow, 0);

      for(var c = 0; c < row.cells.length; c++){
        //get description for header cell...
        var aCell = row.cells[c];
        //default header description...
        var headerDescription="Column " + c;
        if(aCell.item){
          //use item description...
          headerDescription = aCell.item.name;
        }

        //add item...
        var txtItm = this.formHelper.getNewItem(this.formHelper.generateItemIdWithForm(this.editor.form),
        null, 0, 0, 150, 50, this.formHelper.getTooltype("statictext"));
        txtItm.data = {};
        txtItm.html = headerDescription;

        headerRow.selectCell(c);

        this.editor.addItemToForm(txtItm);

      }
    }else{
      //remove headers...
      this.myTableObject.deleteRow(0);
    }

  }

  showColorPicker(setBorderColor){
    this.updateBorderColor = setBorderColor;
    //get top / left picker positions...
    this.pickerLeft = document.documentElement.clientWidth / 2;
    this.pickerTop = document.documentElement.clientHeight / 2;

    if(this.updateBorderColor){
      //set pickerColor = current borderColor...
      this.pickerColor = this.borderColor;
    }else{
      //set pickerColor = current backgroundColor...
      this.pickerColor = this.backgroundColor;
    }
    this.colorPickerVisible = true;
  }

  updateCellPadding(padding){

    if(this.cellMode){
      var selectedCell = this.myTableObject.getSelectedCell();
      if(selectedCell){
        var style = selectedCell.getStyle("padding");
        if(style){
          //update...
          style.value = padding + "px;"
          selectedCell.updateStyle(style);
        }else{
          //add...
          selectedCell.addStyle('padding', padding + 'px');
        }
      }
    }else{
      //table mode...
      for(var r = 0; r < this.myTableObject.rows.length; r++){
        var aRow = this.myTableObject.rows[r];
        for(var c = 0; c < aRow.cells.length; c++){
          var aCell = aRow.cells[c];
          var style = aCell.getStyle("padding");
          if(style){
            //update...
            style.value = padding + "px;"
            aCell.updateStyle(style);
          }else{
            //add...
            aCell.addStyle('padding', padding + 'px');
          }
        }
      }
    }
  }



  updateCellHeight(height){
    var selectedCell = this.myTableObject.getSelectedCell();
    if(selectedCell){
      var style = selectedCell.getStyle("height");
      if(style){
        //update...
        style.value = height + "px;"
        selectedCell.updateStyle(style);
      }else{
        //add...
        selectedCell.addStyle('height', height + 'px');
      }
    }
  }

  updateCellWidth(width){

    var selectedCell = this.myTableObject.getSelectedCell();

    //get column w/ index...
    var column = this.myTableObject.columns[selectedCell.index];
    if(column){
      column.width = width + "px";
    }
  }

  updateBorderSizeClicked(size){
    this.borderSize = size;
    var currentBorder = _.find(this.borderPositionsList, function(b){return b.checked});
    this.setCellBorder(currentBorder, this.borderColor, size);
  }

  borderPositionClick(border){

    //var selectedCell = this.myTableObject.getSelectedCell();

    // for(var i = 0; i < this.borderPositionsList.length; i++){
    //   this.borderPositionsList[i].checked = this.borderPositionsList[i].name == border.name ? true : false;
    // }

    for(var i = 0; i < this.borderPositionsList.length; i++){
      if(this.borderPositionsList[i].name == border.name){
        this.borderPositionsList[i].checked =  border.checked ? false : true;
      }
    }

    if(border.name == 'ALL'){
      for(var i = 0; i < this.borderPositionsList.length; i++){
        this.setCellBorder(this.borderPositionsList[i], this.borderColor, this.borderSize);
      }
    }else{
      this.setCellBorder(border, this.borderColor, this.borderSize);
    }
  }

  setBorderColor(color){
    this.borderColor = color;
    //update selected cell...
    var selectedCell = this.myTableObject.getSelectedCell();
    if(selectedCell){
      var currentBorder = _.find(this.borderPositionsList, function(b){return b.checked});
      this.setCellBorder(currentBorder, color, this.borderSize);
    }
  }

 
  setCellBorder(border, color, size){

    if(this.cellMode){
      var selectedCell = this.myTableObject.getSelectedCell();
      if(selectedCell){
        var style = selectedCell.getStyle(border.value);
        if(style){
          //update...or delete...???
          if(!border.checked){
            selectedCell.removeStyle(border.value);
          }else{
            style.value = size + "px solid " + color;
            selectedCell.updateStyle(style);
          }
        }else{
          //add...
          selectedCell.addStyle(border.value, size + 'px solid ' + color);
        }
      }
    }else{
      //table mode...
      for(var r = 0; r < this.myTableObject.rows.length; r++){
        var aRow = this.myTableObject.rows[r];
        for(var c = 0; c < aRow.cells.length; c++){
          var aCell = aRow.cells[c];
          var style = aCell.getStyle(border.value);
          if(style){
            //update...or delete...???
            if(!border.checked){
              aCell.removeStyle(border.value);
            }else{
              style.value = size + "px solid " + color;
              aCell.updateStyle(style);
            }
          }else{
            //add...
            aCell.addStyle(border.value, size + 'px solid ' + color);
          }
        }
      }
    }
  }



  setBackgroundColor(color){
    this.backgroundColor = color;
    //update selected cell...
    if(this.cellMode){
      var selectedCell = this.myTableObject.getSelectedCell();
      if(selectedCell){
        var style = selectedCell.getStyle("background-color");
        if(style){
          //update...
          style.value = color;
          selectedCell.updateStyle(style);
        }else{
          //add...
          selectedCell.addStyle('background-color', color);
        }
      }
    }else{
      //table mode...
      for(var r = 0; r < this.myTableObject.rows.length; r++){
        var aRow = this.myTableObject.rows[r];
        for(var c = 0; c < aRow.cells.length; c++){
          var aCell = aRow.cells[c];
          var style = aCell.getStyle("background-color");
          if(style){
            //update...
            style.value = color;
            aCell.updateStyle(style);
          }else{
            //add...
            aCell.addStyle('background-color', color);
          }
        }
      }
    }
  }

  getRowWithIndex(table, index){
    //if we didn't give an index, get last row, else use index...
    var i = index == undefined ? table.rows.length - 1 : index;
    var row = table.rows.length > 0 ? table.rows[i] : null;//get last row...
    return row;
  }

  deleteRow(){
    var rowIndex = this.myTableObject.getSelectedRowIndex();
    this.myTableObject.deleteRow(rowIndex);
  }

  deleteColumn(){
    var selectedCell = this.myTableObject.getSelectedCell();
    this.myTableObject.deleteColumn(selectedCell.index);
  }

  addRow(){

    var objTable = this.myTableObject;
    var rowIndex = objTable.getSelectedRowIndex();
    var rowToCopy = objTable.getRow(rowIndex);

    //update model...

    //var lastObjRow = objTable.getRow();
    var newObjRow = this.formHelper.getNewTableRow();
    newObjRow.parent = objTable;
    //copy cell style...
    for(var c = 0; c < rowToCopy.cells.length; c++){
      var aCell = rowToCopy.cells[c];
      var cId = this.editor.form.getUniqueTableCellId();
      var newObjCell = this.formHelper.getNewTableCell(cId);
      newObjCell.styles = aCell.styles;
      newObjCell.colspan = aCell.colspan;
      newObjCell._updateStyleString();
      newObjRow.addCell(newObjCell);
    }
    // objTable.addRow(newObjRow);
    //insert below copied row...
    objTable.insertRow(newObjRow, rowIndex + 1);
  }

  addColumn(){
    //update model...
    var objTable = this.myTableObject;
    for(var r = 0; r < objTable.rows.length; r++){
      var aRow = objTable.rows[r];
      var cId = this.editor.form.getUniqueTableCellId();
      var newCell = this.formHelper.getNewTableCell(cId);
      //copy previous cell style...
      newCell.styles = aRow.cells[aRow.cells.length - 1].styles;
      newCell._updateStyleString();
      aRow.addCell(newCell);
    }
  }






}
