import {inject, bindable} from 'aurelia-framework';
import {Editor} from '../editor'
import {DialogService} from 'aurelia-dialog';
//import {ListboxOptionsDialog} from '../dialogs/listboxOptionsDialog'
import { PopupHelper } from '../../go/popupHelper';

@inject(Editor, DialogService, PopupHelper)
export class ListboxToolbar {

  @bindable targetElementId;
  @bindable dndId;
  @bindable options;
  @bindable hideOptions=false;
  @bindable item;

  textRowHeights=[1, 2, 3, 4, 5, 6, 7, 8];
  currentTextRows=null;


  constructor(Editor, DialogService, PopupHelper) {
    this.editor = Editor;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
  }

  attached() {
    this.reset();
  }

  textRowHeightClicked(rows){
    var itm = this.editor.getItem();
    itm.textRows = rows;
    this.currentTextRows = rows;
  }

  reset(){
    this.hideOptions = false;
    this.options=[];
    if(this.item && this.item.dataColumn && this.item.dataColumn.tableName){
      //this is for DB LISTS...disable options
      this.hideOptions = true;
    }else if(this.item && this.item.dataColumn){
      this.options = this.item.dataColumn.listOptions;
    }
  }

  openListBuilder(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    var popupWidth = windowWidth;// / 4;
    var popupHeight = windowHeight;// / 4;
    var popupTop = 0;//(windowHeight - popupHeight) / 2;
    var popupLeft = 0;// (windowWidth - popupWidth) / 2;

    var dataset = null;
    var customValueId = null;
    var reportingColumnId = null;
    var listId = null;

    if(self.item && self.item.dataColumn && self.item.dataColumn.data){

      //ReportingColumnInfo OR CustomValues???
      if(self.item.dataColumn.data.hasOwnProperty("TableFriendlyName")){
        //reportingColumninfo...
        dataset = self.item.dataColumn.data.TableFriendlyName;
        reportingColumnId = self.item.dataColumn.data.ColumnID;
      }else{
        //customValues...
        dataset = self.item.dataColumn.data.Dataset;
        customValueId = self.item.dataColumn.data.Id;
      }

      listId = self.item.dataColumn.data.ListId;
    }

    var options={
      closeActiveDialog:false
    }

    var listBuilderOptions={
      Dataset:dataset,
      ListId: listId,
      CustomValueId: customValueId,
      ReportingColumnId: reportingColumnId
    }

    self.popupHelper.openViewModelPop('../formbuilder/listbuilder', listBuilderOptions,'List Builder',popupWidth,popupHeight,popupTop,popupLeft,options,function(res){
        if(res.cancelled && res.cancelled){
          return;
        }
        self.options = res.options;
    });
  }

  showOptionsDialog(){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    var popupWidth = windowWidth / 4;
    var popupHeight = windowHeight / 4;
    var popupTop = (windowHeight - popupHeight) / 2;
    var popupLeft = (windowWidth - popupWidth) / 2;

    var options={
      closeActiveDialog:false
    }

    self.popupHelper.openViewModelPop('../formbuilder/dialogs/listboxOptionsDialog', self,'Listbox Options',popupWidth,popupHeight,popupTop,popupLeft,options,function(res){
        if(res.cancelled && res.cancelled){
          return;
        }
        //self.options = res.options;
        self.item.dataColumn.listOptions = res.options;
    });
    
  }

  align(id, mode){
    this.editor.align(id, mode);
  }
}
