import {helper} from '../helpers/helper';
import {inject, observable, computedFrom} from 'aurelia-framework';
import {Data} from '../data/go/data';
import $ from 'jquery';
import {EventAggregator} from 'aurelia-event-aggregator';
//import {formhelper} from './formhelper';
import {formhelper} from '../formbuilder/formhelper';
import * as _ from 'lodash';
//import { NewFormDialog } from './dialogs/newFormDialog';
//import { DatasetPickerDialog } from './dialogs/datasetPickerDialog';
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from '../go/popupHelper';
//import { Chart } from 'chart.js'
//import { NewCustomValueDialog } from './dialogs/newCustomValueDialog';




class ReportJson {

  //chartJsType = null;

  constructor(toolType, fileName, data, options, formItem){
    this.toolType = toolType;
    this.fileName = fileName;
    this.item = formItem;
    this.distinct = false;
    this.width=500;
    this.height=500;
    this.chartJsConfig=this.initConfig(this.getChartJsTypeWithTooltype(toolType), data, options, null);
  }

  getChartJsTypeWithTooltype(toolType){
    if(toolType == 'CHARTBAR'){
      return 'bar';
    }
    if(toolType == 'CHARTLINE'){
      return 'line';
    }
    return 'bar';
  }

  initConfig(type, data, options, plugins){
    return{
      type: type ? type : 'bar',
      data: data ? data : {},
      options: options ? options : {},
      plugins: plugins ? plugins : []
    }
  }
}

class Category{
  constructor(data, name, id){
    this.items = [];
    this.data = data;
    this.name = name;
    this.collapseId = 'collapse' + id;
    this.dataTarget = '#collapse' + id;
    this.expanded = false;
    this.isCustom=false;
  }
}

class OrderBy{
  constructor(data){
    this.data = data;
    this.sortAscending = data.Direction == 'ASC' ? true : false;
  }

  toggleSort(){
    this.sortAscending = this.sortAscending ? false : true;
  }
}

class Column{
  constructor(data, availColumn){
    this.data = data;
    this.OD_ReportAvailableColumns= {
      ColumnID: availColumn.ColumnID,
      TableFriendlyName: availColumn.TableFriendlyName,
      TableName: availColumn.TableName,
      TableAlias: availColumn.TableAlias,
      ColumnFriendlyName: availColumn.ColumnFriendlyName,
      ColumnName: availColumn.ColumnName,
      ColumnAlias: availColumn.ColumnAlias,
      IsQuoted: availColumn.IsQuoted
    }
    this.isX = false;
    this.isY = false;
    this.dateFormat = 'month';
    this.beginAtZero=true;
    this.minScaleValue=10;
    this.maxScaleValue=100;
  }

  updateScale(chartObject, reportObject){

    if(!this.isX && !this.isY)return;

    this.updateChart(chartObject, reportObject);

    // var axe = this.isX ? 'x' : 'y';
    // chartObject.setAxesScaleTicks(axe, this.beginAtZero, parseInt(this.minScaleValue), parseInt(this.maxScaleValue));
  }

  toggleBeginAtZero(chartObject, reportObject){
    this.beginAtZero = this.beginAtZero ? false : true;

    this.updateChart(chartObject, reportObject);

    //chartObject.setAxesScaleTicks(axe, this.beginAtZero, parseInt(this.minScaleValue), parseInt(this.maxScaleValue));
  }

  updateTimeUnit(chartObject){
    chartObject.updateAxesTimeUnit(this.isX ? 'x' : 'y', this.dateFormat);
  }

  toggleXAxis(chartObject, reportObject){
    this.isX = this.isX ? false : true;
    this.isY = this.isX ? false : true;

    //uncheck any other X axes...
    for(var c = 0; c < reportObject.Columns.length; c++){
      if(reportObject.Columns[c].OD_ReportAvailableColumns.TableAlias != this.OD_ReportAvailableColumns.TableAlias &&
        reportObject.Columns[c].OD_ReportAvailableColumns.ColumnAlias != this.OD_ReportAvailableColumns.ColumnAlias){
          reportObject.Columns[c].isX = false;
        }
    }

    this.updateChart(chartObject, reportObject);
  }

  toggleYAxis(chartObject, reportObject){
    this.isY = this.isY ? false : true;
    this.isX = this.isY ? false : true;

    //uncheck any other X axes...
    for(var c = 0; c < reportObject.Columns.length; c++){
      if(reportObject.Columns[c].OD_ReportAvailableColumns.TableAlias != this.OD_ReportAvailableColumns.TableAlias &&
        reportObject.Columns[c].OD_ReportAvailableColumns.ColumnAlias != this.OD_ReportAvailableColumns.ColumnAlias){
          reportObject.Columns[c].isY = false;
        }
    }

    this.updateChart(chartObject, reportObject);

  }

  addToDate(date, months){

    var month = date.getMonth() + 1;
    month += months;
    date.setMonth(month);

    // var day = date.getDate();
    // day += days;
    // date.setDate(day);
    var finalMonth = date.getMonth() + 1;
    if(finalMonth.toString().length == 1){
      //add preceding 0...
      finalMonth = "0" + finalMonth;
    }
    return new Date(`${date.getFullYear()}-${finalMonth}-${date.getDate()}`);
  }

  updateChart(chartObject, reportObject){//, axis, type, dateFormat){

    //is this a date column???
    if(this.data.IsDate){
      //check for single axes (for TIME format...)
      var axesCols = _.filter(reportObject.Columns, function(c){return c.isX == true || c.isY == true});
      if(axesCols.length == 1){
        //setup chart for single date on axes...
        chartObject.removeLabels();
        //data to x, y format object...
        //check data format...

        var currentData = [3, 2, 7, 4, 5];

        for(var i = 0; i < currentData.length; i++){

          var today = new Date();

            //convert it...
            currentData[i]={
              x: axesCols[0].isX ? this.addToDate(today, (i + 1)) : currentData[i],
              y: axesCols[0].isY ? this.addToDate(today, (i + 1)) : currentData[i]
            }
        }


        chartObject.setAxesForTime(axesCols[0].isX ? 'x' : 'y', this.dateFormat);
        chartObject.setAxesAsLinear(axesCols[0].isX ? 'y' : 'x');//set OPPOSITE axes...

        chartObject.setDataset(0, currentData);

        //check for horizontal bar...
        if(axesCols[0].isY && reportObject.Report.Json.chartJsConfig.type == 'bar'){
          chartObject.setChartType('horizontalBar');
        }else if(axesCols[0].isX && reportObject.Report.Json.chartJsConfig.type == 'horizontalBar'){
          chartObject.setChartType('bar');
        }else{
          chartObject.setChartType(reportObject.Report.Json.chartJsConfig.type);
        }

        chartObject.updateChart();
      }
    }else{

      if(!this.isX && !this.isY)return;

      var axe = this.isX ? 'x' : 'y';
      var minS = this.beginAtZero ? undefined : parseInt(this.minScaleValue);
      var maxS = this.beginAtZero ? undefined : parseInt(this.maxScaleValue);
      chartObject.setAxesScaleTicks(axe, this.beginAtZero, minS, maxS);
    }    
  }
}


class Filter{
  stringFilterValues=[
    {
      friendlyOperator: 'Equal to',
      operator: '=',
      not: false
    }, 
    {
      friendlyOperator: 'Not Equal to',
      operator: '!=',
      not: true
    }, 
    {
      friendlyOperator: 'Begins with',
      operator: 'LIKE',
      not: false
    }, 
    {
      friendlyOperator: 'Not Begins with',
      operator: 'NOT LIKE',
      not: true
    }, 
    {
      friendlyOperator: 'Ends with',
      operator: 'LIKE',
      not: false
    }, 
    {
      friendlyOperator: 'Not Ends with',
      operator: 'NOT LIKE',
      not: true
    }, 
    {
      friendlyOperator: 'Contains',
      operator: 'LIKE',
      not: false
    },
    {
      friendlyOperator: 'Not Contains',
      operator: 'NOT LIKE',
      not: true
    }];
  numberFilterValues=[
    {
      friendlyOperator: 'Equal to',
      operator: '=',
      not: false
    },
    {
      friendlyOperator: 'Not Equal to',
      operator: '!=',
      not: true
    },
    {
      friendlyOperator: 'Greater than',
      operator: '>',
      not: false
    },
    {
      friendlyOperator: 'Not Greater than',
      operator: '!>',
      not: true
    },
    {
      friendlyOperator: 'Less than',
      operator: '<',
      not: false
    },
    {
      friendlyOperator: 'Not Less than',
      operator: '!<',
      not: true
    },
    {
      friendlyOperator: 'Greater or Equal to',
      operator: '>=',
      not: false
    },
    {
      friendlyOperator: 'Not Greater or Equal to',
      operator: '<',
      not: true
    },
    {
      friendlyOperator: 'Less or Equal to',
      operator: '<=',
      not: false
    },
    {
      friendlyOperator: 'Not Less or Equal to',
      operator: '>',
      not: true
    }];// ,  'Between'];
  currentFilterValues=[];
  currentFilter;
  previousOperatorAnd=false;
  previousOperatorOr=false;
  inputType='text';

  constructor(data){
    this.data = data;
    //select filter values based on IsString...
    if(data.OD_ReportAvailableColumns.IsString){
      this.currentFilterValues = this.stringFilterValues;
    }else{
      this.currentFilterValues = this.numberFilterValues;
    }

    this.previousOperatorAnd = data.LogicalOperator == "AND" ? true : false;
    this.previousOperatorOr = data.LogicalOperator == "OR" ? true : false;

    //select current filter...
    var filterIndex =_.findIndex(this.currentFilterValues, function(f){return f.friendlyOperator == data.FriendlyOperator});
    this.currentFilter = this.currentFilterValues[filterIndex];

  }

  togglePrevious(){
    this.previousOperatorAnd = this.previousOperatorAnd ? false : true;
    this.previousOperatorOr = this.previousOperatorOr ? false : true;
  }
}



@inject(helper, Data, EventAggregator, DialogService, PopupHelper, formhelper)
export class Editor {


  categories=[];
  categoriesReportingColumnInfo=[];


  categoriesCustomValues=[];

  selectedReportingColumnInfoData=null;
  selectedCategory=null;

  selectedFormTemplate;
  formTemplates=[];

  sidebarExpanded=true;

  reports=[];
  @observable selectedReport;
  selectedReportChanged(newVal, oldVal){

    if(newVal ==null){
      return;
    }

    var rId = 0;

    if(newVal.Report){
      rId = newVal.Report.ReportID;
    }else{
      rId = newVal.ReportID;
    }

    this.loadReport(rId);
  }

  reportObject={
    Report:null,
    Columns: [],
    Filters: [],
    OrderBy: []
  }

  deleteColumns=[];
  deleteOrderBy=[];
  deleteFilters=[];

  // providers=[];
  // @observable selectedProvider=null;

  barForms=true;
  barDatabase=false;
  barSelect=false;
  barFormsDisabled=false;
  barDatabaseDisabled=true;
  barSelectDisabled=true;

  stringFilterValues=['Begins with', 'Ends with', 'Contains'];
  numberFilterValues=['Greater than', 'Less than', 'Greater or Equal to', 'Less or Equal to', 'Between'];
  paperOrientationList=['Portrait', 'Landscape'];

  useDateRange = false;
  startDate=null;
  endDate=null;

  showFormatting=false;

  isDistinctQuery=true;
  isChart=false;

  timeFormats=['day','month','year']

  @computedFrom('reportObject', 'selectedFormTemplate')
  get canRunReport(){
    if(this.reportObject && this.selectedFormTemplate){
      return true;
    }else{
      return false;
    }
  }

  constructor(helper, Data, EventAggregator, DialogService, PopupHelper, formhelper){
    this.helper = helper;
    this.data = Data;
    this.ea = EventAggregator;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
    this.formhelper = formhelper;
  }


  activate(params) {
    let self = this;
    self.loadReportBuilderCategories();
    self.loadFormTemplates();
    //self.loadReportingColumnInfoCategories();
    //self.formhelper.setupFonts();
  }

  attached() {
    let self = this;
    self.loadReports();
  }

  getCurrentChartJsObject(){
    var cr = this.chartref;
    return cr.au.controller.viewModel.currentViewModel;
    //chartBar.setChartAxesType('x', 'time', 'month');
  }

  toggleFormatting(){
    this.showFormatting = this.showFormatting ? false : true;
  }

  toggleDistinctQuery(){
    this.isDistinctQuery = this.isDistinctQuery ? false : true;
  }

  allowDrop(ev) {
    ev.preventDefault();
  }

  drag(ev, obj) {
    var jStr = JSON.stringify(obj);
    ev.dataTransfer.setData("text", jStr);
    return true;
  }

  drop(ev) {
    ev.preventDefault();
    var jStr = ev.dataTransfer.getData("text");
    var jObj = JSON.parse(jStr);
    this.addReportingColumn(jObj, ev.currentTarget.id);
  }

  newReport(type){
    let self = this;

    self.isChart = false;//reset isChart...

    self.data.getWithUrl('reportbuilder', function(res){
      self.reportObject = res;
      self.reportObject.Report.ReportName = 'New Report';
      self.reportObject.Report.ReportTitle = 'New Report';
      self.reportObject.Report.ReportTitleAlignment = 'Center';
      self.reportObject.Report.ReportSubTitle = 'Report';
      self.reportObject.Report.ReportSubTitleAlignment = 'Center';
      self.reportObject.Report.PaperOrientation = 'Portrait';

      //new Json property here...
      if(type != 'table'){

        self.isChart = true;

        var toolType=null;
        var chartJsType='bar';
        if(type == 'chart-bar'){
          toolType = self.formhelper.getTooltype('chartbar');
          chartJsType = 'bar';
        }
        if(type == 'chart-line'){
          chartJsType = 'line';
          type = 'chart-bar';
          toolType = self.formhelper.getTooltype('chartline');
        }

        //update report descriptions...
        self.reportObject.Report.ReportName = 'New ' + chartJsType;
        self.reportObject.Report.ReportTitle = 'New ' + chartJsType;
        self.reportObject.Report.ReportSubTitle = 'Chart';

        self.setupChartItemForReportObject(toolType, chartJsType, self.formhelper.defaultChartOptions(chartJsType), self.formhelper.defaultChartData(chartJsType), 500, 500);

      }


      self.selectedReport = res;
    });
  }

  setupChartItemForReportObject(toolType, chartJsType, chartOptions, chartData, width, height){
    let self = this;

    var itm = self.formhelper.getNewItem(0, toolType, 0, 0, width, height, toolType);
    itm.addBoxClass = false;

    var reportJson  = new ReportJson(toolType, 'chart-bar', chartData, chartOptions, itm);

    //try this...
    reportJson.chartJsConfig.options.maintainAspectRatio = false;

    itm.data = reportJson.chartJsConfig;
    self.reportObject.Report.Json = reportJson;
    self.showFormatting = true;
  }

  toggleDateRange(){
    let self = this;
    if(self.reportObject){
      self.useDateRange = self.useDateRange ? false : true;
    }
  }

  save(){
    let self = this;

    if(!self.reportObject)return;

    var saveObj={
      Columns: [],
      Filters: [],
      OrderBy: [],
      Report: self.formhelper.getNewOD_ReportObject() 
    }

    //update report properties...
    self.setReportPropertiesWithOD_Report(saveObj.Report, self.reportObject.Report);
    //update Report.Json...
    var finalReportJson=null;
    if(self.isChart){
      var currentChartJsObj = self.getCurrentChartJsObject();
      finalReportJson = self.createChartJsonSaveObject(self.reportObject.Report.Json.fileName, self.reportObject.Report.Json.toolType, currentChartJsObj.myChart);
    }else{
      finalReportJson = new ReportJson();
      finalReportJson.chartJsConfig = null;
      finalReportJson.distinct = this.isDistinctQuery;
    }

    saveObj.Report.Json = JSON.stringify(finalReportJson);

    for(var c = 0 ;c < self.reportObject.Columns.length; c++){
      var colObj = self.reportObject.Columns[c].data;
      colObj.OD_ReportAvailableColumns = self.reportObject.Columns[c].OD_ReportAvailableColumns;
      colObj.Delete=false;
      colObj.Position = c;
      colObj.Json = self.createJsonColumnChartPropertiesWithColumn(self.reportObject.Columns[c]);

      saveObj.Columns.push(colObj);
    }

    //add deleted columns...
    for(var c = 0 ;c < self.deleteColumns.length; c++){
      var colObj = self.deleteColumns[c].data;
      colObj.Delete=true;
      saveObj.Columns.push(colObj);
    }

    //update filters object...
    for(var f = 0; f < self.reportObject.Filters.length; f++){
      var fObj = self.reportObject.Filters[f].data;
      fObj.LogicalOperator = self.reportObject.Filters[f].previousOperatorAnd ? 'AND' : 'OR';
      fObj.Operator= self.reportObject.Filters[f].currentFilter.operator,
      fObj.FriendlyOperator= self.reportObject.Filters[f].currentFilter.friendlyOperator,
      fObj.Value= self.reportObject.Filters[f].data.Value
      fObj.Delete=false;
      saveObj.Filters.push(fObj);
    }

    //add deleted filters...
    for(var c = 0 ;c < self.deleteFilters.length; c++){
      var colObj = self.deleteFilters[c].data;
      colObj.Delete=true;
      saveObj.Filters.push(colObj);
    }

    //update orderBy object...
    for(var f = 0; f < self.reportObject.OrderBy.length; f++){
      var fObj = self.reportObject.OrderBy[f].data;
      fObj.Direction = self.reportObject.OrderBy[f].sortAscending ? 'ASC' : 'DESC';// data.Direction == 'ASC' ? true : false;
      fObj.ColumnName = `${fObj.OD_ReportAvailableColumns.TableAlias}.${fObj.OD_ReportAvailableColumns.ColumnAlias}`;
      fObj.Delete=false;
      saveObj.OrderBy.push(fObj);
    }

    //add deleted orderBy...
    for(var c = 0 ;c < self.deleteOrderBy.length; c++){
      var colObj = self.deleteOrderBy[c].data;
      colObj.Delete=true;
      saveObj.OrderBy.push(colObj);
    }

    let saveDescription = `Saving ${saveObj.Report.ReportName}...`;
    let saveDialog = self.helper.createNoty(saveDescription, 3000);
    saveDialog.show();



    //create...
    self.data.postWithUrlAndData('reportbuilder', JSON.stringify(saveObj), function(res){
      if(res != null){
        self.helper.notySuccess(saveDialog, `${saveDescription} saved!`);
        if(self.reportObject.Report.ReportID==0){
          self.reports.push(res.Report);
          //update new report object id's...
          //self.selectedReport.ReportID = res.Report.ReportID;
          self.reportObject.Report.ReportID = res.Report.ReportID;
          //columns...
          for(var c = 0; c < self.reportObject.Columns.length; c++){
            self.reportObject.Columns[c].data.ReportID = res.Report.ReportID;
          }
          //filters...
          for(var f = 0; f < self.reportObject.Filters.length; f++){
            self.reportObject.Filters[f].data.FilterID = res.Filters[f].FilterID;
            self.reportObject.Filters[f].data.ReportID = res.Report.ReportID;
          }
          //orderBy...
          for(var o = 0; o < self.reportObject.OrderBy.length; o++){
            self.reportObject.OrderBy[o].data.ReportID = res.Report.ReportID;
          }
        }

      }else{
        self.helper.notyError(saveDialog, `${saveDescription} failed to save!`);
      }
    });


  }

  createJsonColumnChartPropertiesWithColumn(column){
    if(column.hasOwnProperty('beginAtZero')){
      const json ={
        beginAtZero: column.beginAtZero,
        dateFormat: column.dateFormat,
        isX: column.isX,
        isY: column.isY,
        maxScaleValue: column.maxScaleValue,
        minScaleValue: column.minScaleValue
      }
      return JSON.stringify(json);
    }else{
      return null;
    }
  }

  setReportPropertiesWithOD_Report(newReport, oldReport){
    newReport.ReportID= oldReport.ReportID;
    newReport.ReportName=oldReport.ReportName;
    newReport.ReportTitle=oldReport.ReportTitle;
    newReport.IsReportTitleImage=oldReport.IsReportTitleImage;
    newReport.ReportTitleAlignment=oldReport.ReportTitleAlignment;
    newReport.ReportSubTitle= oldReport.ReportSubTitle;
    newReport.ReportSubTitleAlignment=oldReport.ReportSubTitleAlignment;
    newReport.ColumnSpacing=oldReport.ColumnSpacing;
    newReport.GroupIndentation=oldReport.GroupIndentation;
    newReport.PaperOrientation=oldReport.PaperOrientation;
    newReport.OutcomeVariableWeeks=oldReport.OutcomeVariableWeeks;
    newReport.Json=oldReport.Json;
    return newReport;
  }

  createChartJsonSaveObject(fileName, toolType, myChart){

    var reportJson = new ReportJson();
    reportJson.chartJsConfig.type = myChart.config.type;
    reportJson.fileName = fileName;
    reportJson.toolType = toolType;
    reportJson.distinct = this.isDistinctQuery;
    reportJson.width = parseInt(this.reportObject.Report.Json.item.width);
    reportJson.height = parseInt(this.reportObject.Report.Json.item.height);

    var finalData = {
      datasets:[],
      labels:[]
    }

    for(var i = 0; i < myChart.config.data.datasets.length; i++){
      var ds = _.cloneDeep(myChart.config.data.datasets[i]);
      //ds.data = [];
      if(ds.hasOwnProperty('_meta')){
        delete ds._meta;
      }

      finalData.datasets.push(ds);
    }

    if(myChart.config.data.labels){
      for(var l = 0; l < myChart.config.data.labels.length; l++){
        finalData.labels.push(myChart.config.data.labels[l]);
      }
    }


    reportJson.chartJsConfig.data = finalData;

    reportJson.chartJsConfig.options = {
      scales: myChart.config.options.scales
    }

    return reportJson;
  }

  openReportViewer(reportData){

    let self = this;

    // if(!self.patient && !self.currentProvider){
    //   return;//some error here??
    // }

    //formId = 1036;

    let path = '../formbuilder/viewer';
    // let aDate = self.helper.parseMMDDYYDateString(self.currentBoard.visitInfo.date, "/");
    // let date = self.helper.getMMDDYYYYDateWithDate(aDate);
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let options={
      //displayHeader: false,
      bodyPadding: 0,
      icon: 'fa-list-alt'
    }

    //var instId = instanceId
    // var instanceId = instance ? instance.Id : null;
    // var formId = form ? form.Id : null;
    var description = "Report Viewer";////form ? form.Description : instance.Description;

    if(self.isChart){
      const chartObj = self.getCurrentChartJsObject();
      self.reportObject.Report.Json.chartJsConfig.data.datasets[0].data = reportData;
      self.reportObject.Report.Json.chartJsConfig.options = chartObj.myChart.options;
    }

    self.popupHelper.openViewModelPop(path, {
      jwt: self.helper._jwt, 
      formId: null, 
      patientId: null, 
      providerId: null, 
      date: null, 
      instanceId: null, 
      showSubmit: false, 
      showSubmitAsToolbar: false,
      showPreferenceToolbar: false,
      reportData: reportData,
      reportSettings: self.reportObject.Report,
      showReportToolbar: true
    }, description, windowWidth, windowHeight, 0, 0, options, 
    function(res){

    });
  
  }

  runReport(){
    let self = this;

    if(!self.reportObject && self.selectedFormTemplate)return;

    //self.isChart = self.reportObject.Report.Json ? true : false;

    self.newColumnInfoObject(function(obj){

      var tColumnInfos=[];
      var tFilters=[];
      var tOrderBy=[];

      //columns
      for(var c = 0; c < self.reportObject.Columns.length; c++){

        var aCol = self.reportObject.Columns[c];
        var colClone= _.cloneDeep(obj);

        colClone.ColumnID = aCol.OD_ReportAvailableColumns.ColumnID;
        colClone.TableFriendlyName = aCol.OD_ReportAvailableColumns.TableFriendlyName;
        colClone.TableName = aCol.OD_ReportAvailableColumns.TableName.toUpperCase();
        colClone.TableAlias = aCol.OD_ReportAvailableColumns.TableAlias;
        colClone.ColumnFriendlyName = aCol.OD_ReportAvailableColumns.ColumnFriendlyName;
        colClone.ColumnName = aCol.OD_ReportAvailableColumns.ColumnName;
        colClone.ColumnAlias = aCol.OD_ReportAvailableColumns.ColumnAlias;
        colClone.IsQuoted = aCol.OD_ReportAvailableColumns.IsQuoted;
        colClone.Table = aCol.OD_ReportAvailableColumns.TableFriendlyName;

        colClone.IsAutoWidth = aCol.data.IsAutoWidth;
        colClone.IsMultiline = aCol.data.IsMultiline;
        colClone.Width = aCol.data.Width;
        colClone.HeaderText = aCol.data.HeaderText;
        colClone.IsDate = aCol.data.IsDate;


        //additional object structure for report data...
        if(self.isChart){
          var chartColumnInfo=self.getChartColumnInfoObjectWithColumnInfo(colClone);
          chartColumnInfo.IsX = aCol.isX;
          chartColumnInfo.IsY = aCol.isY;
          chartColumnInfo.IncludeInReport = true;
          colClone = chartColumnInfo;
        }

        tColumnInfos.push(colClone);
      }

      //filters
      for(var c = 0; c < self.reportObject.Filters.length; c++){

        var aFilter = self.reportObject.Filters[c].data;
        //var aCol = self.reportObject.Columns[c];
        var colClone= _.cloneDeep(obj);

        colClone.ColumnID = aFilter.OD_ReportAvailableColumns.ColumnID;
        colClone.TableFriendlyName = aFilter.OD_ReportAvailableColumns.TableFriendlyName;
        colClone.TableName = aFilter.OD_ReportAvailableColumns.TableName;
        colClone.TableAlias = aFilter.OD_ReportAvailableColumns.TableAlias;
        colClone.ColumnFriendlyName = aFilter.OD_ReportAvailableColumns.ColumnFriendlyName;
        colClone.ColumnName = aFilter.OD_ReportAvailableColumns.ColumnName;
        colClone.ColumnAlias = aFilter.OD_ReportAvailableColumns.ColumnAlias;
        colClone.IsQuoted = aFilter.OD_ReportAvailableColumns.IsQuoted;
        colClone.Table = aFilter.OD_ReportAvailableColumns.TableFriendlyName;
        colClone.IsString = aFilter.OD_ReportAvailableColumns.IsString;


        if(self.reportObject.Filters[c].currentFilter){
          colClone.Filter={
            HasPreviousFilter:false,
            LogicalOperator:null,
            Operator: self.reportObject.Filters[c].currentFilter.operator,
            FriendlyOperator: self.reportObject.Filters[c].currentFilter.friendlyOperator,
            Value: self.reportObject.Filters[c].data.Value
          }
          if(self.reportObject.Filters[c].previousOperatorAnd || self.reportObject.Filters[c].previousOperatorOr){
            colClone.Filter.HasPreviousFilter = true;
            colClone.Filter.LogicalOperator = self.reportObject.Filters[c].previousOperatorAnd ? 'AND' : 'OR';
          }
        }

        self.checkAddToReportColumnInfos(obj, aFilter.OD_ReportAvailableColumns, tColumnInfos, self.isChart);


        tFilters.push(colClone);
      }

      //order by
      for(var c = 0; c < self.reportObject.OrderBy.length; c++){

        var aCol = self.reportObject.OrderBy[c];
        var colClone= _.cloneDeep(obj);
        colClone.TableAlias = aCol.data.OD_ReportAvailableColumns.TableAlias;
        colClone.ColumnAlias = aCol.data.OD_ReportAvailableColumns.ColumnAlias;
        colClone.SortDirection = aCol.sortAscending ? 'ASC' : 'DESC';

        //do we need to add this to columns???
        self.checkAddToReportColumnInfos(obj, aCol.data.OD_ReportAvailableColumns, tColumnInfos, self.isChart);

        tOrderBy.push(colClone);
      }


      var obj={
        columnInfos: tColumnInfos,
        filters: tFilters,
        orderBy: tOrderBy,
        fromDate: self.startDate,
        toDate: self.endDate,
        Distinct: self.isDistinctQuery
      }

      if(self.isChart){
        self.data.postWithUrlAndData('reportbuilder/chart/run', JSON.stringify(obj), function(res){
          self.openReportViewer(res);
        });
      }else{
        self.data.postWithUrlAndData('reportbuilder/run', JSON.stringify(obj), function(res){ 
          self.openReportViewer(res);
        });
      }



    });


  }

  getChartColumnInfoObjectWithColumnInfo(columnInfo){
    return {
      ColumnInfo: columnInfo,
      IsX: false,
      IsY: false
    }
  }

  checkAddToReportColumnInfos(colInfoObj, OD_ReportAvailableColumns, reportColumnInfos, isChart){
    //do we need to add this to columns???

    var foundOrderColumn = null;

    if(isChart){
      foundOrderColumn = _.find(reportColumnInfos, 
        function(o){return o.ColumnInfo.ColumnAlias == OD_ReportAvailableColumns.ColumnAlias && 
          o.ColumnInfo.TableAlias == OD_ReportAvailableColumns.TableAlias});
    }else{
      foundOrderColumn = _.find(reportColumnInfos, 
        function(o){return o.ColumnAlias == OD_ReportAvailableColumns.ColumnAlias && 
          o.TableAlias == OD_ReportAvailableColumns.TableAlias});
    }

    if(!foundOrderColumn){
      //add it to reportColumnInfos...
      var orderColClone= _.cloneDeep(colInfoObj);
      orderColClone.ColumnID = OD_ReportAvailableColumns.ColumnID;
      orderColClone.TableFriendlyName = OD_ReportAvailableColumns.TableFriendlyName;
      orderColClone.TableName = OD_ReportAvailableColumns.TableName.toUpperCase();
      orderColClone.TableAlias = OD_ReportAvailableColumns.TableAlias;
      orderColClone.ColumnFriendlyName = OD_ReportAvailableColumns.ColumnFriendlyName;
      orderColClone.ColumnName = OD_ReportAvailableColumns.ColumnName;
      orderColClone.ColumnAlias = OD_ReportAvailableColumns.ColumnAlias;
      orderColClone.IsQuoted = OD_ReportAvailableColumns.IsQuoted;
      orderColClone.Table = OD_ReportAvailableColumns.TableFriendlyName;

      if(isChart){
        orderColClone =this.getChartColumnInfoObjectWithColumnInfo(orderColClone)
        orderColClone.IncludeInReport = false;
      }

      reportColumnInfos.push(orderColClone);

    }
  }

  isColumnDate(columnName){
    return columnName.toUpperCase().indexOf("DATE") > -1 ? true : false;
  }

  newOD_ReportColumnsObject(reportAvailableColumn, tableName, columnName, friendlyColumnName, columnId, reportId){

    var colObj={
      ColumnID: columnId,
      ColumnName: `${tableName}.${columnName}`,
      DepthLevel: 1,
      HeaderText: friendlyColumnName,
      IsAutoWidth: true,
      IsMultiline: false,
      OD_Reports: null,
      Position: 0,
      ReportID: reportId,
      Width: 0,
      IsDate: this.isColumnDate(columnName)
    }
    return colObj;
  }

  newOD_ReportFiltersObject(rci, reportId){
    return{
      ColumnID: rci.ColumnID,
      ColumnName: `${rci.TableAlias}.${rci.ColumnAlias}`,
      FilterID: 0,
      FriendlyOperator: "Contains",
      LogicalOperator: "AND",
      OD_ReportAvailableColumns: rci,
      Operator: "LIKE",
      Position: 0,
      ReportID: reportId,
      Value: null
    }
  }

  newOD_ReportOrderByColumnsObject(rci, reportId){
    return {
      ColumnID: rci.ColumnID,
      ColumnName: `${rci.TableName}.${rci.ColumnName}`,
      Direction: "ASC",
      OD_ReportAvailableColumns: rci,
      Position: 0,
      ReportID: reportId
      }
  }

  newColumnInfoObject(callback){
    this.data.getWithUrl('reportbuilder/columninfo', function(res){
      callback(res);
    })
  }

  addReportingColumn(column, targetId){
    if(targetId == 'report-columns'){
      var c = new Column(this.newOD_ReportColumnsObject(column, column.TableName, 
        column.ColumnAlias, column.ColumnFriendlyName, column.ColumnID, 
        this.reportObject.Report.ReportID), column);
      this.reportObject.Columns.push(c);
    }else if(targetId == 'report-filters'){
      var f = new Filter(this.newOD_ReportFiltersObject(column, this.reportObject.Report.ReportID));
      const iType = this.isColumnDate(column.ColumnAlias) ? 'date' : 'text';
      f.inputType = iType;
      this.reportObject.Filters.push(f);
    }else{//orders
      var o = new OrderBy(this.newOD_ReportOrderByColumnsObject(column, this.reportObject.Report.ReportID));
      this.reportObject.OrderBy.push(o);
      // this.reportObject.OrderBy.push(this.newOD_ReportOrderByColumnsObject(column, this.reportObject.Report.ReportID));
    }
  }

  toggleSidebar(){
    this.sidebarExpanded = this.sidebarExpanded ? false : true;
  }

  loadProviders(){
    let self = this;
    self.data.getProviders(false, function(pros){
      self.providers = pros;
      //add ALL provider...
      var all = {ProviderID: 0, ProviderEntity: 'All'}
      self.providers.splice(0, 0,all);
    });
  }

  loadReport(id){
    let self = this;

    if(id != 0){
      self.getReportObjectWithId(id, function(res){

        self.reportObject = res;

        //chart???
        if(res.Report.Json){
          var reportJson = JSON.parse(res.Report.Json);
          self.isChart = reportJson.chartJsConfig ? true : false;
          self.isDistinctQuery = reportJson.distinct;
          //do chart setup...
          if(self.isChart){
            self.setupChartItemForReportObject(reportJson.toolType, reportJson.chartJsConfig.type, 
              reportJson.chartJsConfig.options, reportJson.chartJsConfig.data, reportJson.width, reportJson.height);
          }
        }else{
          self.isChart = false;//reset...
        }


        var filterObjects=[];
        var orderObjects=[];
        var columnObjects = [];

        self.deleteColumns=[];
        self.deleteFilters=[];
        self.deleteOrderBy=[];

        for(var c = 0; c < res.Columns.length; c++){
          //create filter object...
          var col = new Column(res.Columns[c], res.Columns[c]);
          //update additional properties from Json...
          if(res.Columns[c].Json){
            var colJson = JSON.parse(res.Columns[c].Json);
            col.beginAtZero = colJson.beginAtZero;
            col.dateFormat = colJson.dateFormat;
            col.isX = colJson.isX;
            col.isY = colJson.isY;
            col.minScaleValue = colJson.minScaleValue;
            col.maxScaleValue = colJson.maxScaleValue;
          }
          columnObjects.push(col);
        }
        self.reportObject.Columns = columnObjects;

        for(var f = 0; f < res.Filters.length; f++){
          //create filter object...
          var filter = new Filter(res.Filters[f]);
          filterObjects.push(filter);
        }
        self.reportObject.Filters = filterObjects;

        for(var o = 0; o < res.OrderBy.length; o++){
          //create filter object...
          var orderBy = new OrderBy(res.OrderBy[o]);
          orderObjects.push(orderBy);
        }
        self.reportObject.OrderBy = orderObjects;

      });

    }
  }

  getReportObjectWithId(id, callback){
    let self = this;
    self.data.getWithUrl(`reportbuilder/report/${id}/object`, function(res){
      callback(res);
    });
  }

  loadReports(){
    let self = this;

    self.data.getWithUrl('reportbuilder/reports/all', function(res){
      self.reports = res;
    });

  }

  // loadReportingColumnInfoCategories(){
  //   let self = this;
  //   self.categories = [];
  //   self.categoriesReportingColumnInfo=[];
  //   self.data.getWithUrl('reportingcolumninfo/categories', function(res){
  //     for(let c = 0; c < res.length; c++){
  //       let cat = new Category(res[c], res[c].TableFriendlyName, res[c].ColumnID);//data.ColumnID
  //       self.categoriesReportingColumnInfo.push(cat);
  //     }
  //     self.categories = self.categoriesReportingColumnInfo;
  //   })
  // }

  loadFormTemplates(){
    let self = this;
    self.formTemplates = [];
    self.data.getWithUrl('goforms?type=REPORT', function(res){
      self.formTemplates = res;
    })
  }

  loadReportBuilderCategories(){
    let self = this;
    self.categories = [];
    self.categoriesReportingColumnInfo=[];
    self.data.getWithUrl('reportbuilder/tables', function(res){
      for(let c = 0; c < res.length; c++){
        let cat = new Category(res[c], res[c].TableFriendlyName, res[c].ColumnID);//data.ColumnID
        self.categoriesReportingColumnInfo.push(cat);
      }
      self.categories = self.categoriesReportingColumnInfo;
    })
  }

  getReportingColumnsWithCategory(category, callback){
    let self = this;
    var url = `reportbuilder/columns?table=${category.data.TableName}`;
    self.data.getWithUrl(url, function(res){
      category.items = res;
      if(callback){
        callback();
      }
    })
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


  removeColumn(c, type){

    let self = this;

    if(self.reportObject){
      if(type=='order'){
        var foundIndex = _.findIndex(self.reportObject.OrderBy, 
          function(f){return f.data.OD_ReportAvailableColumns.ColumnAlias == c.data.OD_ReportAvailableColumns.ColumnAlias && 
                              f.data.OD_ReportAvailableColumns.TableAlias == c.data.OD_ReportAvailableColumns.TableAlias});
        if(foundIndex >= 0){
          self.deleteOrderBy.push(self.reportObject.OrderBy[foundIndex]);
          self.reportObject.OrderBy.splice(foundIndex, 1);
        }

      }else if(type=='column'){
        var foundIndex = _.findIndex(self.reportObject.Columns, 
          function(f){return f.OD_ReportAvailableColumns.ColumnAlias == c.OD_ReportAvailableColumns.ColumnAlias &&
                            f.OD_ReportAvailableColumns.TableAlias == c.OD_ReportAvailableColumns.TableAlias});
        if(foundIndex >= 0){
          self.deleteColumns.push(self.reportObject.Columns[foundIndex]);
          self.reportObject.Columns.splice(foundIndex, 1);
        }
      }else{
        //filter...
        var foundIndex = _.findIndex(self.reportObject.Filters, 
                          function(f){return f.data.OD_ReportAvailableColumns.ColumnAlias == c.data.OD_ReportAvailableColumns.ColumnAlias &&
                            f.data.OD_ReportAvailableColumns.TableAlias == c.data.OD_ReportAvailableColumns.TableAlias &&
                            f.data.Operator == c.data.Operator && f.data.Value == c.data.Value});
        if(foundIndex >= 0){
          self.deleteFilters.push(self.reportObject.Filters[foundIndex]);
          self.reportObject.Filters.splice(foundIndex, 1);
        }
      }
    }
  }












}
