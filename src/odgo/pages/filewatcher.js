
import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, observable, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {DialogService} from 'aurelia-dialog';
import {Data} from '../../data/go/data';
import {AddLicense} from '../dialogs/addLicense';

class FWObject{
  constructor(description, inbound, processed, running, id, type){
    this.description = description;
    this.inboundPath = inbound;
    this.processedPath = processed;
    this.running = running;
    this.id = id;
    this.type = type;
  }
}

class LogItem{
  constructor(data){
    this.name = data.Data;
    this.type = data.Type;
    this.status = data.Status;
    this.confidence=data.Confidence;
    this.log = JSON.stringify(JSON.parse(data.JobLog), null, 2);
    this.displayLog=false;
    this.color = this.getColor("background", data.Confidence);
    this.textColor = this.getColor("text",data.Confidence);
    this.message=this.getDestinationFolder(data.JobLog);
  }

  getDestinationFolder(jobLog){
    var obj = JSON.parse(jobLog);
    var logMessage =  _.find(obj.LogMessages, function(l){return l.Message.indexOf('Moved to:') > -1});
    return logMessage ? logMessage.Message : "";
  }

  getColor(colorType, confidence){
    var tClass = "";
    if(confidence == 'High'){
      tClass= 'success';
    }else if(confidence == 'Medium'){
      tClass= 'warning';
    }else if(confidence == 'Low'){
      tClass= 'danger';
    }else{
      tClass='secondary';
    }
    if(confidence == null){
      return colorType == 'background' ? 'table-' + tClass : 'text-dark';
    }else{
      return colorType == 'background' ? 'table-' + tClass : 'text-'+ tClass;
    }
  }

  view(){
    this.displayLog = this.displayLog ? false : true;
  }
}

@inject(helper, http, DialogService, Data)
export class Filewatcher {


  home=null;
  //filewatcher=null;
  logItems=[];

  filewatchers=[];
  selectedFilewatcher=null;
  selectedFilewatcherType=null;
  filewatcherTypeList=['fax', 'scan'];

  @observable createDescription=null;
  @observable createInboundPath = null;
  @observable createProcessedPath = null;

  createDisabled=true;

  @observable filterDate;
  @bindable datepicker;
  logPageSizes=[25, 50, 100];
  @observable logPageSize;
  totalLogPages;
  logPageNumber;
  maxCardWidth;
  bodyHeight=0;
  scrollHeight=0;

  filterDateChanged(newVal, oldVal){
    let self = this;
    self.getLog(self.filterDate, 1, self.home.selectedTenant.data.Id);
  }

  logPageSizeChanged(newVal, oldVal){
    let self = this;
    self.logPageNumber = 1;
    self.getLog(self.filterDate, 1, self.home.selectedTenant.data.Id);
  }

  createDescriptionChanged(newVal, oldVal){
    if(this.createDescription != null 
      && this.createInboundPath != null 
      && this.createProcessedPath != null
      && this.createDescription.length > 0 
      && this.createInboundPath.length > 0
      && this.createProcessedPath.length > 0){
      this.createDisabled = false;
    }else{
      this.createDisabled = true;
    }
  }

  createInboundPathChanged(newVal, oldVal){
    if(
      //this.createDescription != null && 
      this.createInboundPath != null &&
      this.createInboundPath.length > 0 &&
      // && this.createProcessedPath != null
      this.selectedFilewatcherType != null
      //&& this.createDescription.length > 0 
      //&& this.createProcessedPath.length > 0
      ){
        this.createDisabled = false;
      }else{
        this.createDisabled = true;
      }
  }

  createProcessedPathChanged(newVal, oldVal){
    if(this.createDescription != null 
      && this.createInboundPath != null 
      && this.createProcessedPath != null
      && this.createDescription.length > 0 
      && this.createInboundPath.length > 0
      && this.createProcessedPath.length > 0){
        this.createDisabled = false;
      }else{
        this.createDisabled = true;
      }
  }

  get filewatcherStatusButton(){
    if(this.selectedFilewatcher){
      return this.selectedFilewatcher.running ? "Stop" : "Start";
    }
  }

  get filewatcherStatus(){
    if(this.selectedFilewatcher){
      return this.selectedFilewatcher.running ? "Running" : "Stopped";
    }
  }

  get rowColor(){
    if(this.selectedFilewatcher){
      return this.selectedFilewatcher.running ? "table-success" : "table-secondary";
    }
  }

	constructor(helper, http, dialogService, Data){
		this.helper = helper;
		this.http = http;
		this.dialogService = dialogService;
    this.goData = Data;
	}

	attached(){
    var testthis = "TEST";
    this.maxCardWidth = this.filewatchercard.clientWidth;
    var container = document.getElementById("odgoContainer");
    this.bodyHeight = container.clientHeight - 42 - 20;
    // this.scrollHeight = this.bodyHeight - this.filewatcherHeader.clientHeight - 20;
	}

	activate(model){
		let self = this;
    self.home = model;

    self.filterDate = moment().format("MM-DD-YYYY");
    self.logPageSize=self.logPageSizes[0];
    
    // var licUrl = `inboundfaxfilewatcher/tenant?id=${self.home.selectedTenant.data.Id}`;
    // self.goData.getWithFaxUrl(licUrl, function(res){
    //   if(res){
    //     self.filewatcher = new FWObject(res.Description, res.Path, res.ProcessPath, res.EnableRaisingEvents, res.Id);
    //     if(self.filewatcher){
    //       self.getLog(self.filterDate, self.home.selectedTenant.data.Id);
    //     }
    //   }
    // })

    var n = self.helper.createNoty("Loading filewatchers...", 30000);
    n.show();

    var fwUrl = `filewatchers?tenantId=${self.home.selectedTenant.data.Id}`;
    self.goData.getWithFaxUrl(fwUrl, function(res){

      for(var i = 0; i < res.length; i++){
        let aFw= new FWObject(res[i].Description, res[i].Path, res[i].ProcessPath, res[i].EnableRaisingEvents, res[i].Id, res[i].FilewatcherType);
        self.filewatchers.push(aFw);
        self.selectedFilewatcher = aFw;
      }

      self.helper.updateNoty(n, "Filewatchers loaded!!", "success", 3000);
      
      self.getLog(self.filterDate, self.home.selectedTenant.data.Id);
    })


	}

  statusButtonClick(){
    let self = this;
    switch(self.filewatcherStatusButton){
      case 'Start':
        self.startService();
        break;

      case 'Stop':
        self.stopService();
        break;
    }
  }

  startService(){
    let self = this;
    var url = 'inboundfaxfilewatcher/start?id='+ self.home.selectedTenant.data.Id;

    self.goData.postWithFaxUrlAndData(url, null, function(res){
      if(res){
        //update row color and status...
        self.selectedFilewatcher.running = true;
      }else{
        //failed to start...
      }

    });
  }

  stopService(){
    let self = this;
    var url = 'inboundfaxfilewatcher/stop?id='+ self.home.selectedTenant.data.Id;

    self.goData.postWithFaxUrlAndData(url, null, function(res){
      if(res){
        //update row color and status...
        self.selectedFilewatcher.running = false;
      }else{
        //failed to start...
      }

    });
  }

  deleteService(){
    let self = this;
    var url = 'inboundfaxfilewatcher/delete?id='+ self.home.selectedTenant.data.Id;

    self.goData.deleteWithFaxUrl(url, function(res){
      if(res){
        //update row color and status...
        self.selectedFilewatcher=null;
      }else{
        //failed to start...
      }

    });
  }

  deleteButtonClick(){
    this.deleteService();
  }

  newWatcher(){
    this.selectedFilewatcher=null;
  }

  createClick(){
    let self = this;

    var n = self.helper.createNoty("Creating filewatcher...", 30000);
    n.show();

    self.goData.getWithFaxUrl('inboundfaxfilewatcher/new', function(filewatcher){

      var tenant = self.home.selectedTenant.data;
      filewatcher.Description = self.selectedFilewatcherType;
      filewatcher.InboundPath = self.createInboundPath;
      filewatcher.ProcessedPath = self.createInboundPath;
      filewatcher.TenantIdFK = tenant.Id;
      filewatcher.Type = self.selectedFilewatcherType;

      self.goData.postWithFaxUrlAndData('inboundfaxfilewatcher/create', JSON.stringify(filewatcher), function(res){

        if(res.Error != null){
          self.helper.updateNoty(n, "Filewatcher failed: " + res.Error, "error", 3000);
        }else{
          self.helper.updateNoty(n, "Filewatcher created!!", "success", 3000);
        }

        if(res.Watcher){
          self.selectedFilewatcher = new FWObject(res.Watcher.Description, res.Watcher.Path, res.Watcher.ProcessPath, res.Watcher.EnableRaisingEvents, res.Watcher.Id, self.selectedFilewatcherType);
        }
      });

    });
  }

  getPagedLog(pageSize, pageNumber, date, tenantId){
    let self = this;
    var url = `jobqueue/getallpagedbydate?pagesize=${pageSize}&pageNumber=${pageNumber}&date=${date}&tenantfk=${tenantId}`;
    self.goData.getWithFaxUrl(url, function(res){
      self.logItems=[];
      for(let i = 0; i < res.length; i++){
        self.logItems.push(new LogItem(res[i]));
      }
    })
  }

  clearLog(){
    let self = this;
    var url = `jobqueue/clear?tenantfk=${self.home.selectedTenant.data.Id}`;
    self.goData.getWithFaxUrl(url, function(success){
      if(success){
        self.totalLogPages = 0;
        self.logPageNumber = 0;
        self.logItems = [];
      }
    })
  }

  getLog(date, pageNumber, tenantId){
    let self = this;
    self.getTotalLogCountWithDate(date, tenantId, function(count){
      //now with total count, determine pages with logsPerPage...
      if(count == 0){
        self.totalLogPages = 0;
        return;
      }else if(count > self.logPageSize){
        self.totalLogPages = Math.ceil(count / self.logPageSize);
      }else{
        self.totalLogPages = 1;
      }
      self.logPageNumber = pageNumber;

      self.getPagedLog(self.logPageSize, pageNumber, self.filterDate, self.home.selectedTenant.data.Id);
    });
  }

  getTotalLogCountWithDate(date, tenantId, callback){
    let self = this;
    var url = `jobqueue/gettotalbydate?date=${date}&tenantfk=${tenantId}`;
    self.goData.getWithFaxUrl(url, function(count){
      callback(count);
    })
  }

  pageClicked(number){
    let self = this;
    if(self.home.selectedTenant){
      self.getLog(self.filterDate, number + 1, self.home.selectedTenant.data.Id);
    }
  }
}
