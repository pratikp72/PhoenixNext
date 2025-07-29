import {inject, bindable, computedFrom} from 'aurelia-framework';
import {DndService} from 'bcx-aurelia-dnd';
import { Editor } from '../editor';
import {EventAggregator} from 'aurelia-event-aggregator';
import { formhelper } from '../formhelper';
// import * as _ from 'lodash';

@inject(DndService, Editor, EventAggregator, formhelper)
export class Mytable {
  @bindable item;
  @bindable fullwidth=false;
  //selected=false;
  repeaterTemplate=null;

  constructor(dndService, Editor, EventAggregator, formhelper) {
    this.dndService = dndService;
    this.editor = Editor;
    this.ea = EventAggregator;
    this.formhelper = formhelper;
  }

  activate(model){
    this.item = model;
  }

  attached() {
    let self = this;
    const elem = document.getElementById(self.item.id);
    this.dndService.addSource(self, {noPreview: true, element: elem});
    //this signals that this tool is automatically complete - for enabling SUBMIT button on form...
    this.ea.publish('checkComplete', self.item);

    //get repeater row template if needed...
    if(self.item.table.isRepeater){
      var rowCount = self.item.table.rows.length;
      //get last row...
      var aRow = self.item.table.getRow(rowCount - 1);
      //clone...
      self.repeaterTemplate = aRow.cloneRow();
    }
  }

  detached() {
    this.dndService.removeSource(this);
  }

  cellClick(row, cellIndex, e){
    let self = this;
    row.selectCell(cellIndex, function(cell){

      var ops = self.formhelper.getTableCellOptionsForElement(e.srcElement, cell, self.item.table.editMode, self.item.table);
      self.ea.publish('showTableCellOptions', ops);

    });
  }

  itemClicked(e){
    if(this.item.showToolbar){
      e.stopPropagation();
      return;
    }

    this.ea.publish("itemClicked", this.item);
    e.stopPropagation();
  }

  addRow(){
    let self = this;
    // var rowCount = self.item.table.rows.length;
    // //get last row...
    // var aRow = self.item.table.getRow(rowCount - 1);
    //clone...
    var rClone = self.repeaterTemplate.cloneRow();
    //clear values...
    for(var c = 0; c < rClone.cells.length; c++){
      var aCell = rClone.cells[c];
      aCell.item.value = null;
    }
    self.item.table.addRow(rClone);
  }

  deleteRow(index){
    this.item.table.deleteRow(index);
  }

  dndModel() {
    return {
      type: 'moveItem',
      id: this.item.id
    };
  }

  @computedFrom('item', 'item.x', 'item.y', 'item.width', 'item.height', 'item.selected')
  get positionCss() {
    const x = (this.item && this.item.x) || 0;
    const y = (this.item && this.item.y) || 0;
    const width = (this.item && this.item.width) || 0;
    const height = (this.item && this.item.height) || 0;
    const boxCursor = (this.item && this.item.selected) ? "pointer" : "default";
    const border = (this.item && this.item.selected) ? "1px dashed #007bff" : "none";

    //check for fullwidth...
    var finalWidth=null;
    if(this.fullwidth){
      finalWidth = 'inherit';
    }else{
      finalWidth = width + 'px';
    }

    return {
      left: x + 'px',
      top: y + 'px',
      width: finalWidth,
      height: height + 'px',
      cursor: boxCursor,
      border : border
    };
  }
}
