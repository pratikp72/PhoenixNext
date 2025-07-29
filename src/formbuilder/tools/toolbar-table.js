import {inject, bindable, observable} from 'aurelia-framework';
import {Editor} from '../editor'
import { formhelper } from '../formhelper';
  
@inject(Editor, formhelper)
export class ToolbarTable {

  @bindable item;
  @bindable parentToolbar;

  borderColor;
  borderSize=1;

  borderPositionsList=['ALL', 'TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
  selectedBorderPosition=null;
  cellBorderPositions=[];



  constructor(Editor, formhelper) {
    this.editor = Editor;
    this.formhelper = formhelper;
  }

  textAlignTable(alignment){
    this.updateTableSelectedCellStyle('text-align', alignment);
  }

  updateTableSelectedCellStyle(name, value){
    //var itm = this.editor.getItem();
    var tableObj = this.item.table;
    var selectedCell = tableObj.getSelectedCell();
    var aStyle = selectedCell.getStyle(name);
    if(aStyle){
      //update
      aStyle.value = value;
      selectedCell.updateStyle(aStyle);
    }else{
      //add
      selectedCell.addStyle(name, value);
    }
  }

  toggleFill(){
    var tableObj = this.item.table;
    var selectedCell = tableObj.getSelectedCell();
    if(selectedCell && selectedCell.item){
      selectedCell.item.width = selectedCell.item.width == 'auto' ? '100%' : 'auto';
    }
  }

  toggleRepeat(){
    this.item.table.setRepeater(this.item.table.isRepeater ? false : true);
  }

  openCustomSearchDialogClick(){
    this.editor.openCustomSearchDialog(this.item.table);
  }

  toggleEditMode(){
    let self = this;
    self.item.table.setEditMode(self.item.table.editMode ? false : true);

    var cellOps = null;

    //do we have tableCellOptionsData? if not select first cell in table and create it...
    if(!self.editor.tableCellOptionsData){
      //get first row...
      var aRow = self.item.table.getRow();
      aRow.selectCell(0, function(c){
        var cEl = document.getElementById(c.cId);
        cellOps = self.formhelper.getTableCellOptionsForElement(cEl, c, self.item.table.editMode, self.item.table);
      });
    }else{
      //get selected cell...
      var selected = self.item.table.getSelectedCell();
      var cEl = null;
      if(selected){
        cEl = document.getElementById(selected.cId);
      }else{
        //get first row...
        var aRow = self.item.table.getRow();
        aRow.selectCell(0, function(c){
          selected = c;
          cEl = document.getElementById(c.cId);
        });
      }

      cellOps = self.formhelper.getTableCellOptionsForElement(cEl, selected, self.item.table.editMode, self.item.table);
    }

    self.editor.tableCellOptionsData = cellOps;
  }

 

}
