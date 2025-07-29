import {customElement, bindable, ObserverLocator, inject} from 'aurelia-framework';

@customElement('dataset-picker')
@inject(ObserverLocator)
export class DatasetPicker {

  @bindable datacolumncallback;
  //@bindable categoryClickedCallback;
  @bindable categories;
  @bindable formhelper;
  @bindable data;
  selectedCategory=null;

  constructor(ObserverLocator){
     this.observerLocator = ObserverLocator;
  }

  categoryClicked(category){
    let self = this;
    if(category.items.length > 0){
      self.selectCategory(category);
    }else{
      if(category.isCustom){
        self.getCustomValuesWithCategory(category, function(res){
          self.selectCategory(category);
        });
      }else{
        self.getReportingColumnsWithCategory(category, function(res){
          self.selectCategory(category);
        });
      }
    }
  }

  dataColumnClicked(dc){
    let self = this;
    if(self.datacolumncallback != undefined){
      self.datacolumncallback({dataColumn: dc});
    }
  }

  selectCategory(category){
    let self = this;
    for(let g = 0; g < self.categories.length; g++){
      if(self.categories[g].name == category.name){
        self.selectedCategory = self.categories[g];
        self.categories[g].expanded = true;
      }else{
        self.categories[g].expanded = false;
      }
    }
  }

  getReportingColumnsWithCategory(category, callback){
    let self = this;
    var url = `reportingcolumninfo/elements/lists?category=${category.data.TableFriendlyName}`;
    self.data.getWithUrl(url, function(res){
      for(let c = 0; c < res.length; c++){
        let rc = self.formhelper.getNewDataColumn(res[c]);
        rc.name = res[c].ColumnFriendlyName;
        rc.editable = res[c].Editable;
        rc.listId = res[c].ListId;
        rc.id = res[c].ColumnID;
        rc.displayType = res[c].DisplayType;
        rc.tableName= res[c].TableName;
        rc.columnName = res[c].ColumnName;
        rc.columnAlias = res[c].ColumnAlias;
        category.items.push(rc);
      }
      if(callback){
        callback();
      }
    })
  }

  getCustomValuesWithCategory(category, callback){
    let self = this;
    var url = `customvalues?dataset=${category.name}`;
    self.data.getWithUrl(url, function(res){
      for(let c = 0; c < res.length; c++){
        let rc = self.formhelper.getNewDataColumn(res[c]);
        rc.name = res[c].Name;
        rc.editable = true;//set custom values editable...
        rc.listId = res[c].ListId;
        rc.id = res[c].Id;
        rc.displayType = res[c].Datatype;
        rc.tableName= 'OD_GO_Forms_Custom_Values_Instance';
        rc.columnName = 'Value';
        category.items.push(rc);
      }
      if(callback){
        callback();
      }
    })
  }


}
