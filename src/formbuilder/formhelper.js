import {inject, observable, computedFrom} from 'aurelia-framework';
import * as _ from 'lodash';
import { Chart } from 'chart.js'




const TOOLTYPE = {
  CHECKBOX: 'CHECKBOX',
  TEXTBOX: 'TEXTBOX',
  STATICTEXT: 'STATICTEXT',
  LISTBOX: 'LISTBOX',
  SIGNATURE: 'SIGNATURE',
  IMAGEBOX: 'IMAGEBOX',
  MARQUEE: 'MARQUEE',
  HR: 'HR',
  MYTABLE: 'MYTABLE',
  CHARTBAR: 'CHARTBAR',
  CHARTLINE: 'CHARTLINE'
};

const FORMDATATYPE = Object.freeze({
  REPORTINGCOLUMNINFO: 'REPORTINGCOLUMNINFO',
  GOFORMCUSTOMVALUE: 'GOFORMCUSTOMVALUE',
});

class ListItem{
  constructor(text, normal){
    this.text = text;
    this.normal = normal;
    this.sql=null;
  }
}

class DataColumn {
  constructor(data){
    this.data=data;
    this.name = null;
    this.editable = false;
    this.displayType=null;
    this.listId=0;
    this.listOptions=[];
    this.selected = false;
    this.id=null;
    this.tableName=null;
    this.columnName=null;
    this.columnAlias=null;
    this.dataIdColumn=null;
    this.dataId=null;
    this.value=null;
    this.isSystemDate=false;
  }

  @computedFrom('displayType')
  get readableType(){

      switch(this.displayType){
        case "int":
          return "number";
        case "datetime":
          return "date";
        case "bit":
          return "boolean";
        default:
          return "text";
      }
    
  } 
}

class ChartData{
  constructor(type, data, options){
    this.data = data;
    this.options = options;
    this.type = type;
  }
}

class Item{
  constructor(id, name, x, y, width, height, toolType){
    this.id=id;
    this.name=name;
    this.x=x;
    this.y=y;
    this.width=width;
    this.height=height;
    this.selected=false;
    this.data;
    this.disabled = false;
    this.toolType=toolType;
    this.elementId = 'e'+ this.id;
    this.editMode=true;
    this.value=null;
    this.html=null;
    this.style=null;
    this.required = false;
    this.inputType='text';//unique to textbox, static-text
    this.showToolbar = false;
    this.dataColumn=null;
    this.addBoxClass=true;
    this.table=null;
    this.textRows=1;
    //this.incomplete=false;
    // this.anchorRight=false;
    // this.anchorLeft=false;
    // this.right=null;
  }
}

class Form{
  constructor(id, name){
    this.id = id;
    this.name = name;
    this.providerId=0;
    this.type;
    this.pages=[];
    this.selected = false;
    this.ogPreferenceId=null;
    this.ogPreferenceTable=null;
    this.maturityDays=null;
    this.ids=[];
    this.dataIds=[];
    this.tag=null;
    this.fullWidth=false;
    this.displayInNoteMenu=false;
    this.displayInExamDropdown=false;
    this.displayInPortalKioskPreferences=false;
    this.primaryExam=null;
  }

  tryAddDataIdToFormWithItem(item){
    if(item.dataColumn &&
      item.dataColumn.data){
        if(item.dataColumn.data.hasOwnProperty('ColumnID')){
          //add reportingColumnInfoId...
          this.addDataId(item.dataColumn.id, "REPORTINGCOLUMNINFO");
        }else{
          //add customFormId...
          this.addDataId(item.dataColumn.id, "GOFORMCUSTOMVALUE");
        }
    }
  }

  addDataId(id, type){
    this.dataIds.push({'id': id, 'type': type});
  }

  findDataId(id, type){
    return _.find(this.dataIds, function(i){return i.id == id && i.type == type});
  }

  deleteDataId(id, type){
    var index = _.findIndex(this.dataIds, function(i){return i.id == id && i.type == type});
    this.dataIds.splice(index, 1);
  }

  deleteId(id){
    //remove id from ids...
    var idIndex = _.findIndex(this.ids, function(x){return x == id});
    this.ids.splice(idIndex, 1);
  }

  addPage(page, index){
    //get new page id...
    var id = this.pages.length + 1;
    page.id = 'p'+ id;
    this.pages.splice(index, 0, page);
  }

  deletePage(index){
    this.pages.splice(index, 1);
  }

  selectPage(index){
    for(let i = 0; i < this.pages.length; i++){
      this.pages[i].selected = i === index ? true : false;
    }
  }

  getCurrentPage(){
    for(let i = 0; i < this.pages.length; i++){
      if(this.pages[i].selected){
        return this.pages[i];
      }
    }
    return null;
  }

  getItemWithId(id){
    for(let p = 0; p < this.pages.length; p++){
      var aPage = this.pages[p];
      for(let i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];
        if(aItm.id == id){
          return aItm;
        }
      }
    }
    return null;
  }

  getUniqueTableCellId(){
    //get all items across pages...
    var finalId = 0;
    for(let p = 0; p < this.pages.length; p++){
      var aPage = this.pages[p];
      for(let i = 0; i < aPage.items.length; i++){
        var aItm = aPage.items[i];
        if(aItm.table){
          for(var r = 0; r < aItm.table.rows.length; r++){
            var aRow = aItm.table.rows[r];
            for(var c = 0; c < aRow.cells.length; c++){
              finalId++;
            }
          }
        }else{
          finalId++;
        }
      }
    }
    return `${'c'+finalId}`;
  }
}

class Page{

  @observable top=null;

  constructor(id){
    this.id = id;
    this.selected = false;
    this.items=[];
    this.index=0;
  }

  addItem(item){
    this.items.push(item);
  }

  topChanged(newVal, oldVal){
    //do something here...
    var tNew = newVal;
  }

}

class MyTableObject{
  constructor(data){
    this.data = data;
    this.style=null;
    this.rows=[];
    this.editMode=false;
    this.columns=[];
    this.isRepeater=false;
    this.displayHeaders=false;
  }

  cloneForSave(){
    //removes all parent objects...
    var tableClone = _.cloneDeep(this);
    for(var i = 0; i < tableClone.rows.length; i++){
      var aRow = tableClone.rows[i];
      delete aRow.parent;
      for(var c = 0; c < aRow.cells.length; c++){
        var aCell = aRow.cells[c];
        delete aCell.parent;
      }
    }
    return tableClone;
  }

  toggleTableHeaders(){
    this.displayHeaders = this.displayHeaders ? false : true;
  }

  getSelectedCell(){
    var row = _.find(this.rows, function(r){return r.selected});
    if(!row)return null;
    return _.find(row.cells, function(c){return c.selected});
  }

  getSelectedRowIndex(){
    return _.findIndex(this.rows, function(r){return r.selected});
  }

  setEditMode(editing){
    this.editMode = editing;

    //if we're NOT in edit mode, deselect all rows /cells...
    if(!this.editMode){
      this.deselectAll();
    }
  }

  setRepeater(repeat){
    this.isRepeater = repeat;

    if(this.isRepeater && this.rows.length > 1){
      //only allow 1 row...check for header...
      for(var i = 0; i < this.rows.length; i++){
        var deleteIndex = this.displayHeaders ? 2 : 1;
        this.deleteRow(deleteIndex);   
      }
    }
  }

  deselectAll(){
    for(let i = 0; i < this.rows.length; i++){
      this.rows[i].selected = false;
      for(var c = 0; c < this.rows[i].cells.length; c++){
        this.rows[i].cells[c].selected = false;
        if(this.rows[i].cells[c].item){
          this.rows[i].cells[c].item.selected = false;
          this.rows[i].cells[c].item.showToolbar = false;
        }
      }
    }
  }

  deleteRow(index){
    //check for header...
    // if(this.rows[index].isHeader){
    //   return;//can't delete header row...
    // }
    this.rows.splice(index, 1);
  }

  deleteColumn(index){
    for(var i = 0; i < this.rows.length; i++){
      this.rows[i].removeCell(index);
    }
    //delete column...
    this.columns.splice(index, 1);
  }

  addColumn(col){
    this.columns.push(col);
  }

  getColumn(index){
    return this.columns[index];
  }

  addRow(row){
    row.parent = this;
    this.rows.push(row);
  }

  insertRow(row, index){
    row.parent = this;
    if(this.rows.length > index){
      this.rows.splice(index, 0, row);
    }else{
      this.rows.push(row);
    }
  }

  getRow(index){
    if(index == undefined){
      return this.rows[this.rows.length - 1];
    }else{
      return this.rows[index];
    }
  }

  getHeaderRow(){
    if(this.rows.length > 0){
      var row = this.rows[0];
      for(var c = 0; c < row.cells.length; c++){
        if(row.cells[c].isHeader){
          return row;
        }
      }
      return null;
    }
    return null;
  }
}

class MyTableColumn{
  constructor(width){
    this.width = width;
  }
}

class MyTableRow{
  constructor(data){
    this.data = data;
    this.cells=[];
    this.selected=false;
    this.parent = null;
    //this.isHeader=false;
    this.display=true;
  }

  cloneRow(){
    return _.cloneDeep(this);
  }

  cloneRow_NoDeep(){
    return _.clone(this);
  }

  addCell(cell){
    cell.parent = this;
    cell.index = this.cells.length;
    this.cells.push(cell);

    //do we have a column already??
    var aColumn = this.parent.columns[cell.index];
    if(!aColumn){
      //add column...
      var newCol = new MyTableColumn();
      this.parent.addColumn(newCol);
    }
  }

  removeCell(index){
    this.cells.splice(index, 1);
    //update cell indexes...
    for(var i = 0; i < this.cells.length; i++){
      this.cells[i].index = i;
    }
  }

  selectCell(index, callback){
    //only select cell if we're in edit mode...

    //deselect other rows / cells...
    this.parent.deselectAll();
    this.selected=true;
    this.cells[index].selected = true;
    if(callback){
      callback(this.cells[index]);
    }
  }
}

class MyTableCell{
  constructor(data){
    this.data = data;
    this.styles = [];
    this.isHeader=false;
    this.html = null;
    this.selected=false;
    this.parent=null;
    this.index=0;
    this.colspan=1;
    this.styleAsString="";
    this.item=null;
    this.cId=null;
  }

  _updateStyleString(){
    var style="";
    for(var i = 0; i < this.styles.length; i++){
      style = style + this.styles[i].name + ":" + this.styles[i].value + ";";
    }
    this.styleAsString= style;
  }

  getStyle(name){
    return _.find(this.styles, function(s){return s.name == name});
  }

  getBorderStyles(){
    return _.filter(this.styles, function(s){return s.name.includes('border')});
  }

  updateStyle(style){
    var index = _.findIndex(this.styles, function(s){return s.name == style.name});
    this.styles.splice(index, 1, style);
    this._updateStyleString();
  }

  addStyle(name, value){
    this.styles.push({'name': name, 'value': value});
    this._updateStyleString();
  }

  removeStyle(name){
    var index = _.findIndex(this.styles, function(s){return s.name == name});
    this.styles.splice(index, 1);
    this._updateStyleString();
  }

  mergeCellLeft(event){
    //remove previous cell...
    this.parent.cells.splice(this.index - 1, 1);
    //reduce this cells index...
    for(var i = this.parent.cells.length - 1; i > -1; i--){
      var aCell = this.parent.cells[i];
      if(aCell.index == this.index){
        aCell.colspan = aCell.colspan + 1;
        aCell.index = aCell.index - 1;
      }else{
        aCell.colspan = Math.max(1, aCell.colspan - 1);
        aCell.index = Math.max(0, aCell.index - 1);
      }
    }

    event.stopPropagation();
  }

  mergeCellRight(event){
    //remove next cell...
    this.parent.cells.splice(this.index + 1, 1);
    //reduce this cells index...
    for(var i = 0; i < this.parent.cells.length; i++){
      var aCell = this.parent.cells[i];

      if(aCell.index == this.index){
        aCell.colspan = aCell.colspan + 1;
      }else if(i > this.index){
        aCell.colspan = Math.max(1, aCell.colspan - 1);
        aCell.index = Math.max(0, aCell.index - 1);
      }
    }
    event.stopPropagation();
  }

  hasLeftNeighbor(){
    return this.index > 0 ? true : false;
  }

  hasRightNeighbor(){
    return this.index < this.parent.cells.length - 1 ? true : false;
  }
}

export class formhelper {

  constructor(){
    console.log("FORM BUILDER HELPER");
  }

  FORMDATATYPES = FORMDATATYPE;

  fontSizes=[8,9,10,11, 12, 14, 16, 18, 20]
  fonts=[];

  swatches=[];

  getFormCenterX(){
    var containerEl = document.getElementById("mainContainer");
    // var distanceToTop = containerEl.getBoundingClientRect().top;
    // var diff = distanceToTop < 0 ? 0 : distanceToTop;
    // var windowHeight = document.documentElement.clientHeight;
    return containerEl.clientWidth / 2;
    // var y = windowHeight / 2;//distanceToTop;
    //var y = (windowHeight / 2) - diff;
    //return {X: x, Y:y};
  }

  generateItemIdWithForm(form){
    var sorted = _.orderBy(form.ids, function(i){return i;}, "desc");
    var id = sorted.length == 0 ? 1 : sorted[0] + 1;
    form.ids.push(id);
    return id;
  }

  buildMyTableObjectDataWithItem(form, item, formCellCount, callback){

    var cellCount = formCellCount;

    var data = item.table ? item.table : item.data;//changed
    var newTable = this.getNewTable();
    newTable.editMode = false;
    newTable.style = data.style;
    newTable.displayHeaders = data.displayHeaders;
    if(data.hasOwnProperty("isRepeater")){
      newTable.isRepeater = data.isRepeater;
    }
    //add columns...
    if(data.columns){
      for(var col = 0; col < data.columns.length; col++){
        var aCol = this.getNewTableColumn();
        if(data.columns[col].width){
          aCol.width = data.columns[col].width;
        }
        if(data.columns[col].description){
          aCol.description = data.columns[col].description;
        }
        newTable.columns.push(aCol);
      }
    }
    //add rows...
    for(var i = 0; i < data.rows.length; i++){
      var dataRow = data.rows[i];
      var aRow = this.getNewTableRow();
      aRow.parent = newTable;
      //add 3 cells...
      for(var c = 0; c < dataRow.cells.length; c++){
        var dataCell = dataRow.cells[c];
        //var cId = cellCount
        cellCount+=1;
        const cId = `${'c'+ cellCount}`;
        var aCell = this.getNewTableCell(cId);
        aCell.html = dataCell.html;
        aCell.colspan = dataCell.colspan;
        aCell.styleAsString = dataCell.styleAsString;
        aCell.item = dataCell.item;
        if(dataCell.item){
          //add elementId if needed...
          if(aCell.item.elementId == undefined){
            aCell.item.elementId = "e" + dataCell.item.id;
          }
          //add to form ids...
          form.ids.push(dataCell.item.id);

          form.tryAddDataIdToFormWithItem(dataCell.item);
        }

        //build styles array from stylesAsString...
        if(dataCell.styleAsString != null){
          var splitStyles = dataCell.styleAsString.split(";");
          for(var x = 0; x < splitStyles.length; x++){
            var colonSplit = splitStyles[x].split(":");
            if(colonSplit[0].length > 0){
              aCell.addStyle(colonSplit[0], colonSplit[1] + ";");
            }
          }
        }else{
          for(var s = 0; s < dataCell.styles.length; s++){
            aCell.addStyle(dataCell.styles[s].name, dataCell.styles[s].value);
          }
        }

        aRow.addCell(aCell);
      }
      newTable.addRow(aRow);
    }
    //return newTable;
    callback({table: newTable, totalCellCount: cellCount});
  }

  getNewListItem(text, isNormal){
    return new ListItem(text, isNormal);
  }

  getItemRightWithElementId(elementId){
    var el = document.getElementById(elementId);
    var els = document.querySelectorAll("#"+ elementId);
    if(el){
      var rect = el.getBoundingClientRect();
      var cont = document.getElementById('mainContainer');
      var contRect = cont.getBoundingClientRect();
      return (contRect.x + contRect.width) - (rect.x + rect.width);
    }else{
      return null;
    }
  }

  getDataTypeForDataColumn(dataColumn){
    if(dataColumn && dataColumn.data){
      if(dataColumn.data.hasOwnProperty('ColumnID')){
        return this.FORMDATATYPES.REPORTINGCOLUMNINFO;
      }else if(dataColumn.data.hasOwnProperty('Dataset')){
        return this.FORMDATATYPES.GOFORMCUSTOMVALUE;
      }else{
        return null;
      }
    }
    return null;
  }

  setupFonts(){
    let self = this;
    const fontCheck = new Set([
      // Windows 10
    'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'HoloLens MDL2 Assets', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Historic', 'Segoe UI Emoji', 'Segoe UI Symbol', 'SimSun', 'Sitka', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic',
      // macOS
      'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS', 'Avenir', 'Avenir Next', 'Avenir Next Condensed', 'Baskerville', 'Big Caslon', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bradley Hand', 'Brush Script MT', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin', 'Comic Sans MS', 'Copperplate', 'Courier', 'Courier New', 'Didot', 'DIN Alternate', 'DIN Condensed', 'Futura', 'Geneva', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif', 'Monaco', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate', 'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand', 'Tahoma', 'Times', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Verdana', 'Zapfino',
    ].sort());
    
    document.fonts.ready.then((fontFaceSet) => {
 
      const fontAvailable = new Set();
    
      for (const font of fontCheck.values()) {
        if (document.fonts.check(`12px "${font}"`)) {
          fontAvailable.add(font);
        }
      }
      self.fonts = Array.from(fontAvailable);

    });
  }

  getFontSizePickerArray(){
    var fontSizes=[]
    for(let i = 0; i < this.fontSizes.length; i++){
      var px = this.pointToPixels(this.fontSizes[i]);
      var fs={"points": this.fontSizes[i], "pixels": px + 'px'}
      fontSizes.push(fs);
    }
    return fontSizes;
  }

  pointToPixels(point){
    return (point / 72) * 96;
  }

  getRandomRGBColor(){
    //return Math.floor(Math.random()*16777215).toString(16);
    return{
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    }
    // let r = Math.floor(Math.random() * 256); // Random between 0-255
    // let g = Math.floor(Math.random() * 256); // Random between 0-255
    // let b = Math.floor(Math.random() * 256); // Random between 0-255
  }

  getRandomHSLColor(){
    //return Math.floor(Math.random()*16777215).toString(16);
    return{
      h: Math.floor(Math.random() * 361),
      s: 100,
      l: 50
    }
    // let r = Math.floor(Math.random() * 256); // Random between 0-255
    // let g = Math.floor(Math.random() * 256); // Random between 0-255
    // let b = Math.floor(Math.random() * 256); // Random between 0-255
  }

  getNewChartData(type, data, options){
    return new ChartData(type, data, options);
  }

  getNewItem(id, name, x, y, width, height, toolType){
    return new Item(id,
    name, x, y, width, height, toolType);
  }

  getNewForm(){
    return new Form(0, 'Test Form');
  }

  getNewPage(){
    return new Page(0);
  }

  getTooltype(name){
    return TOOLTYPE[name.toUpperCase()];
  }

  getNewTable(){
    return new MyTableObject();
  }

  getNewTableColumn(){
    return new MyTableColumn();
  }

  getNewTableRow(){
    return new MyTableRow();
  }

  getNewTableCell(uniqueCellId){
    var cell = new MyTableCell();
    cell.cId = uniqueCellId;
    return cell;
  }

  getNewDataColumn(data){
    return new DataColumn(data);
  }

  convertDatatypeToReadable(datatype){
    switch(datatype){
      case "int":
        return "number";
      case "datetime":
        return "date";
      case "bit":
        return "boolean";
      default:
        return "text";
    }
  }

  defaultChartOptions(chartJsType){
    if(chartJsType == 'bar'){
      return Chart.defaults.bar;
    }else if(chartJsType == 'line'){
      return Chart.defaults.line;
    }
  }

  defaultChartData(chartJsType){

    //get 5 random colors...
    var bgs = [];
    var borders = [];
    
    const isBar = chartJsType == 'bar' ? true : false;
    const isLine = chartJsType == 'line' ? true : false;

    //create some colors for bar chart...
    if(isBar){
      for(var i = 0; i < 5; i++){
        var c = this.getRandomHSLColor();
        bgs.push(`hsl(${c.h}, ${c.s}%, ${c.l}%)`);
        borders.push(`hsl(${c.h}, ${c.s}%, 30%)`);//a bit darker...
      }
    }

    //create dataObject...
    var dataObj={
      labels: ['One', 'Two', 'Three', 'Four', 'Five'],

      datasets: [{
          label: 'Colors',
          data: [3, 2, 7, 4, 5],
          backgroundColor: bgs,//bar only
          borderColor: borders,
          borderWidth: 1,
      }]
    }

    //add line relevant properties...
    if(isLine){
      //add pointColor...
      dataObj.datasets[0].pointBackgroundColor= 'rgb(255, 0, 0)';//line
      //add border color...
      dataObj.datasets[0].borderColor.push('rgb(255, 0, 0)');//line
      //background color...
      dataObj.datasets[0].backgroundColor.push('rgba(0, 0, 0, 0.02)');//line
    }

    return dataObj;
  }

  getNewOD_ReportObject(){
    return{
      ReportID: 0,
      ReportName: null,
      ReportTitle: null,
      IsReportTitleImage: false,
      ReportTitleAlignment: null,
      ReportSubTitle: null,
      ReportSubTitleAlignment: null,
      ColumnSpacing: 0,
      GroupIndentation: 0,
      PaperOrientation: null,
      OutcomeVariableWeeks: null,
      Json: null
    }
  }

  getTableCellOptionsForElement(el, cell, showTableCellOptions, table){
    let rect = el.getBoundingClientRect();
    var fWin = document.getElementById('formWindow');
    var fList = document.getElementById('formList');

    rect.y += fWin.scrollTop;
    rect.x -= fList.width;
    return {'show': showTableCellOptions, 'cell': cell, 'rect': rect, 'table': table};
  }

}
